import { NextRequest, NextResponse } from "next/server";

// File extensions to include
const SOURCE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".rb", ".java",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala",
  ".vue", ".svelte", ".astro", ".md", ".mdx", ".json", ".yaml", ".yml",
  ".toml", ".sql", ".graphql", ".prisma", ".sh", ".bash", ".zsh",
];

// Paths/patterns to skip
const SKIP_PATTERNS = [
  "node_modules", ".git", "dist", "build", ".next", ".vercel",
  "__pycache__", ".pytest_cache", "target", "vendor", ".gradle",
  "coverage", ".nyc_output", ".turbo", ".cache",
];

const SKIP_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  "Cargo.lock", "Gemfile.lock", "poetry.lock", "composer.lock",
];

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface ScanResult {
  stage: "idea" | "prototype" | "mvp" | "growth" | "mature";
  stage_reasoning: string;
  top_recommendation: {
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: string;
  };
  secondary_recommendations: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: string;
  }>;
}

async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchFileTree(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubTreeItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch file tree: ${res.status}`);
  }
  const data = await res.json();
  return data.tree || [];
}

function shouldIncludeFile(path: string): boolean {
  // Skip directories matching patterns
  for (const pattern of SKIP_PATTERNS) {
    if (path.includes(`/${pattern}/`) || path.startsWith(`${pattern}/`)) {
      return false;
    }
  }

  // Skip specific lock files
  const filename = path.split("/").pop() || "";
  if (SKIP_FILES.includes(filename)) {
    return false;
  }

  // Skip images and binary files
  const binaryExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webm", ".pdf", ".zip", ".tar", ".gz"];
  for (const ext of binaryExtensions) {
    if (path.toLowerCase().endsWith(ext)) {
      return false;
    }
  }

  // Include if it has a source extension
  for (const ext of SOURCE_EXTENSIONS) {
    if (path.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  // Get token from request body
  let accessToken: string;
  try {
    const body = await request.json();
    accessToken = body.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing accessToken in request body" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Check for OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch file tree
    const tree = await fetchFileTree(owner, repo, accessToken);

    // Filter to source files only
    const sourceFiles = tree
      .filter((item) => item.type === "blob" && shouldIncludeFile(item.path))
      .slice(0, 50);

    // Fetch README.md and package.json explicitly
    const [readme, packageJson] = await Promise.all([
      fetchGitHubFile(owner, repo, "README.md", accessToken),
      fetchGitHubFile(owner, repo, "package.json", accessToken),
    ]);

    // Fetch source file contents in parallel (batched to avoid rate limits)
    const fileContents: Array<{ path: string; content: string }> = [];
    const batchSize = 10;

    for (let i = 0; i < sourceFiles.length; i += batchSize) {
      const batch = sourceFiles.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (file) => {
          const content = await fetchGitHubFile(owner, repo, file.path, accessToken);
          return { path: file.path, content: content || "" };
        })
      );
      fileContents.push(...results.filter((r) => r.content));
    }

    // Build concatenated content
    let concatenated = "";

    if (readme) {
      concatenated += `=== README.md ===\n${readme}\n\n`;
    }

    if (packageJson) {
      concatenated += `=== package.json ===\n${packageJson}\n\n`;
    }

    concatenated += `=== File Tree (${tree.length} items) ===\n`;
    concatenated += tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path)
      .slice(0, 200)
      .join("\n");
    concatenated += "\n\n";

    for (const file of fileContents) {
      concatenated += `=== ${file.path} ===\n${file.content}\n\n`;
    }

    // Limit total size to ~200KB for GPT
    if (concatenated.length > 200000) {
      concatenated = concatenated.slice(0, 200000) + "\n\n[TRUNCATED]";
    }

    // Call OpenAI Responses API (required for gpt-5.2-codex)
    const prompt = `Analyze this codebase and return ONLY valid JSON (no markdown, no code blocks, just raw JSON):

${concatenated}

Return this exact JSON structure:
{
  "stage": "idea|prototype|mvp|growth|mature",
  "stage_reasoning": "why this stage",
  "top_recommendation": {
    "title": "short title",
    "description": "what and why",
    "impact": "high|medium|low",
    "effort": "hours estimate"
  },
  "secondary_recommendations": [
    {
      "title": "short title",
      "description": "what and why", 
      "impact": "high|medium|low",
      "effort": "hours estimate"
    }
  ]
}

Stage definitions:
- idea: Just a concept, minimal/no code
- prototype: Proof of concept, exploring feasibility
- mvp: Minimum viable product, core features work
- growth: Active development, gaining users/features
- mature: Stable, well-maintained, production-ready

Include 2-3 secondary recommendations. Be specific and actionable.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.2-codex",
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract text from Responses API format: data.output[1].content[0].text
    const messageOutput = data.output?.find((o: { type: string }) => o.type === "message");
    const responseText = messageOutput?.content?.[0]?.text || "";

    // Parse JSON from response
    let result: ScanResult;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse analysis result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      meta: {
        filesScanned: fileContents.length,
        totalFiles: tree.filter((i) => i.type === "blob").length,
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
