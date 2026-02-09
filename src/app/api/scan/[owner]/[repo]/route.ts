import { NextRequest, NextResponse } from "next/server";
import { fetchRepoFiles } from "@/lib/github-tarball";

const SOURCE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".rb", ".java",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala",
  ".vue", ".svelte", ".astro", ".md", ".mdx", ".json", ".yaml", ".yml",
  ".toml", ".sql", ".graphql", ".prisma", ".sh", ".bash", ".zsh",
];

const SKIP_PATTERNS = [
  "node_modules", ".git", "dist", "build", ".next", ".vercel",
  "__pycache__", ".pytest_cache", "target", "vendor", ".gradle",
  "coverage", ".nyc_output", ".turbo", ".cache",
];

const SKIP_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  "Cargo.lock", "Gemfile.lock", "poetry.lock", "composer.lock",
];

function shouldIncludeFile(filePath: string): boolean {
  for (const pattern of SKIP_PATTERNS) {
    if (filePath.includes(`/${pattern}/`) || filePath.startsWith(`${pattern}/`)) return false;
  }
  const filename = filePath.split("/").pop() || "";
  if (SKIP_FILES.includes(filename)) return false;
  const binaryExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webm", ".pdf", ".zip", ".tar", ".gz"];
  for (const ext of binaryExtensions) {
    if (filePath.toLowerCase().endsWith(ext)) return false;
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (filePath.endsWith(ext)) return true;
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  let accessToken: string;
  let includePack = false;
  try {
    const body = await request.json();
    accessToken = body.accessToken;
    includePack = body.includePack === true;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken in request body" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { files: allFiles, totalFiles: totalFilesInRepo } = await fetchRepoFiles(
      owner, repo, accessToken, shouldIncludeFile, 50
    );

    const readme = allFiles.find(f => f.path === "README.md")?.content;
    const packageJson = allFiles.find(f => f.path === "package.json")?.content;

    let concatenated = "";
    if (readme) concatenated += `=== README.md ===\n${readme}\n\n`;
    if (packageJson) concatenated += `=== package.json ===\n${packageJson}\n\n`;
    concatenated += `=== File Tree (${totalFilesInRepo} items) ===\n`;
    concatenated += allFiles.map(f => f.path).join("\n");
    concatenated += "\n\n";
    for (const file of allFiles) {
      concatenated += `=== ${file.path} ===\n${file.content}\n\n`;
    }
    if (concatenated.length > 200000) {
      concatenated = concatenated.slice(0, 200000) + "\n\n[TRUNCATED]";
    }

    // Build pack content if requested
    let packContent: string | undefined;
    let packMeta: Record<string, number> | undefined;
    if (includePack) {
      packContent = concatenated;
      const lines = packContent.split("\n").length;
      const chars = packContent.length;
      const words = packContent.split(/\s+/).length;
      packMeta = {
        filesIncluded: allFiles.length,
        totalFiles: totalFilesInRepo,
        lines,
        chars,
        words,
        sizeKB: Math.round(chars / 1024),
        estimatedTokens: Math.round(chars / 4),
      };
    }

    const prompt = `Analyze this codebase and return ONLY valid JSON (no markdown, no code blocks, just raw JSON):

${concatenated}

Return this exact JSON structure:
{
  "stage": "idea|prototype|mvp|growth|mature",
  "stage_reasoning": "why this stage",
  "optimization_goal": "a short phrase describing what the developer is likely optimizing for, e.g. 'Shipping an MVP fast', 'Reducing production risk', 'Developer experience', 'Scaling for growth'",
  "top_recommendation": {
    "title": "short title",
    "description": "what and why",
    "impact": "high|medium|low",
    "effort": "hours estimate",
    "relevant_files": ["src/path/to/file.ts"]
  },
  "secondary_recommendations": [
    {
      "title": "short title",
      "description": "what and why",
      "impact": "high|medium|low",
      "effort": "hours estimate",
      "relevant_files": ["src/path/to/file.ts"]
    }
  ]
}

Stage definitions:
- idea: Just a concept, minimal/no code
- prototype: Proof of concept, exploring feasibility
- mvp: Minimum viable product, core features work
- growth: Active development, gaining users/features
- mature: Stable, well-maintained, production-ready

Include 2-3 secondary recommendations. Be specific and actionable.
For each recommendation, include 3-5 relevant file paths from the codebase.
The optimization_goal should be inferred from the codebase structure, README, and current state.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ model: "gpt-5.2-codex", input: prompt }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const messageOutput = data.output?.find((o: { type: string }) => o.type === "message");
    const responseText = messageOutput?.content?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse OpenAI response:", responseText);
      return NextResponse.json({ error: "Failed to parse analysis result" }, { status: 500 });
    }

    // Ensure optimization_goal exists
    if (!result.optimization_goal) {
      result.optimization_goal = "General improvement";
    }

    const responseBody: Record<string, unknown> = {
      success: true,
      analysis: result,
      meta: { filesScanned: allFiles.length, totalFiles: totalFilesInRepo },
    };

    if (includePack && packContent) {
      responseBody.packContent = packContent;
      responseBody.packMeta = packMeta;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
