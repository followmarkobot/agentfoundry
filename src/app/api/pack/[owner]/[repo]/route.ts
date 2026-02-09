import { NextRequest, NextResponse } from "next/server";

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

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

function getLanguageFromExt(path: string): string {
  const ext = path.split(".").pop() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", go: "go", rs: "rust", rb: "ruby", java: "java",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    swift: "swift", kt: "kotlin", scala: "scala", vue: "vue",
    svelte: "svelte", astro: "astro", md: "markdown", mdx: "mdx",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    sql: "sql", graphql: "graphql", prisma: "prisma",
    sh: "bash", bash: "bash", zsh: "bash",
  };
  return map[ext] || "";
}

async function fetchGitHubFile(owner: string, repo: string, path: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function fetchFileTree(owner: string, repo: string, token: string): Promise<GitHubTreeItem[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch file tree: ${res.status}`);
  const data = await res.json();
  return data.tree || [];
}

function shouldIncludeFile(path: string): boolean {
  for (const pattern of SKIP_PATTERNS) {
    if (path.includes(`/${pattern}/`) || path.startsWith(`${pattern}/`)) return false;
  }
  const filename = path.split("/").pop() || "";
  if (SKIP_FILES.includes(filename)) return false;
  const binaryExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webm", ".pdf", ".zip", ".tar", ".gz"];
  for (const ext of binaryExtensions) {
    if (path.toLowerCase().endsWith(ext)) return false;
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (path.endsWith(ext)) return true;
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  let accessToken: string;
  try {
    const body = await request.json();
    accessToken = body.accessToken;
    if (!accessToken) return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const tree = await fetchFileTree(owner, repo, accessToken);
    const sourceFiles = tree.filter((item) => item.type === "blob" && shouldIncludeFile(item.path)).slice(0, 100);

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

    // Calculate stats
    const totalLines = fileContents.reduce((sum, f) => sum + f.content.split("\n").length, 0);
    const totalChars = fileContents.reduce((sum, f) => sum + f.content.length, 0);
    const totalWords = fileContents.reduce((sum, f) => sum + f.content.split(/\s+/).filter(Boolean).length, 0);
    const totalBytes = new TextEncoder().encode(fileContents.map(f => f.content).join("")).byteLength;
    const totalFilesInRepo = tree.filter(i => i.type === "blob").length;

    // Build repomix-style output with preamble
    let output = "";

    // Preamble
    output += `This file is a merged representation of the entire codebase, combined into a single document by AgentFoundry.\n\n`;
    output += `================================================================\n`;
    output += `Repository: ${owner}/${repo}\n`;
    output += `================================================================\n\n`;
    output += `## How to Use This File\n\n`;
    output += `This file contains the complete source code of the repository in a format optimized for AI consumption.\n`;
    output += `You can paste this into any LLM (ChatGPT, Claude, Gemini, etc.) and ask questions about the codebase,\n`;
    output += `request code reviews, ask for refactoring suggestions, or generate documentation.\n\n`;
    output += `## Repository Stats\n\n`;
    output += `- **Files included:** ${fileContents.length} / ${totalFilesInRepo} total\n`;
    output += `- **Lines of code:** ${totalLines.toLocaleString()}\n`;
    output += `- **Characters:** ${totalChars.toLocaleString()}\n`;
    output += `- **Words:** ${totalWords.toLocaleString()}\n`;
    output += `- **Size:** ${(totalBytes / 1024).toFixed(1)} KB\n`;
    output += `- **Estimated tokens:** ~${Math.round(totalChars / 4).toLocaleString()}\n\n`;

    // File tree
    output += `## File Tree\n\n`;
    output += "```\n";
    output += sourceFiles.map((f) => f.path).join("\n");
    output += "\n```\n\n";

    // File contents
    output += `## Source Files\n\n`;
    for (const file of fileContents) {
      const lang = getLanguageFromExt(file.path);
      const lines = file.content.split("\n").length;
      output += `### ${file.path} (${lines} lines)\n\n`;
      output += `\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
    }

    return NextResponse.json({
      success: true,
      content: output,
      meta: {
        filesIncluded: fileContents.length,
        totalFiles: totalFilesInRepo,
        lines: totalLines,
        chars: totalChars,
        words: totalWords,
        sizeKB: Math.round(totalBytes / 1024),
        estimatedTokens: Math.round(totalChars / 4),
      },
    });
  } catch (error) {
    console.error("Pack error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pack failed" }, { status: 500 });
  }
}
