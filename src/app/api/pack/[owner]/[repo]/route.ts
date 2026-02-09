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

    // Generate per-file summaries via LLM
    const openaiKey = process.env.OPENAI_API_KEY;
    let fileSummaries: Record<string, string> = {};
    if (openaiKey) {
      try {
        const fileSnippets = fileContents.map(f => {
          const firstLines = f.content.split("\n").slice(0, 8).join("\n");
          return `${f.path}:\n${firstLines}`;
        }).join("\n---\n");

        const summaryPrompt = `For each file below, write a ONE-LINE summary (max 80 chars) of what it does. Return ONLY valid JSON: { "summaries": { "path": "summary", ... } }\n\n${fileSnippets}`;

        const summaryRes = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: "gpt-5.2-codex", input: summaryPrompt }),
        });

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          const text = summaryData.output?.map((o: { content?: Array<{ text?: string }> }) =>
            o.content?.map((c: { text?: string }) => c.text || "").join("") || ""
          ).join("") || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            fileSummaries = parsed.summaries || parsed;
          }
        }
      } catch (e) {
        console.error("File summary generation failed:", e);
        // Continue without summaries
      }
    }

    // Build repomix-style output with preamble
    let output = "";

    // Preamble
    output += `This file is a merged representation of the entire codebase, combined into a single document by AgentFoundry.\n\n`;
    output += `<file_summary>\n`;
    output += `This section contains a summary of this file.\n\n`;
    output += `<purpose>\n`;
    output += `This file contains a packed representation of the entire repository's contents.\n`;
    output += `It is designed to be easily consumable by AI systems for analysis, code review,\n`;
    output += `or other automated processes.\n`;
    output += `</purpose>\n\n`;
    output += `<file_format>\n`;
    output += `The content is organized as follows:\n`;
    output += `1. This summary section\n`;
    output += `2. Repository information and stats\n`;
    output += `3. Directory structure\n`;
    output += `4. Multiple file entries, each consisting of:\n`;
    output += `   - File path as a header\n`;
    output += `   - Full contents of the file\n`;
    output += `</file_format>\n\n`;
    output += `<usage_guidelines>\n`;
    output += `- This file should be treated as read-only. Any changes should be made to the original repository files, not this packed version.\n`;
    output += `- When processing this file, use the file path to distinguish between different files in the repository.\n`;
    output += `- Be aware that this file may contain sensitive information. Handle it with the same level of security as you would the original repository.\n`;
    output += `</usage_guidelines>\n\n`;
    output += `<notes>\n`;
    output += `- Some files may have been excluded based on .gitignore rules and AgentFoundry's configuration\n`;
    output += `- Binary files are not included in this packed representation\n`;
    output += `- Lock files (package-lock.json, yarn.lock, etc.) are excluded\n`;
    output += `- Files in node_modules, .git, dist, build, .next, .vercel are excluded\n`;
    output += `</notes>\n`;
    output += `</file_summary>\n\n`;

    // Repository info
    output += `<repository_info>\n`;
    output += `Repository: ${owner}/${repo}\n`;
    output += `Files included: ${fileContents.length} / ${totalFilesInRepo}\n`;
    output += `Lines of code: ${totalLines.toLocaleString()}\n`;
    output += `Characters: ${totalChars.toLocaleString()}\n`;
    output += `Words: ${totalWords.toLocaleString()}\n`;
    output += `Size: ${(totalBytes / 1024).toFixed(1)} KB\n`;
    output += `Estimated tokens: ~${Math.round(totalChars / 4).toLocaleString()}\n`;
    output += `</repository_info>\n\n`;

    // Directory structure with summaries
    output += `<directory_structure>\n`;
    output += sourceFiles.map((f) => {
      const summary = fileSummaries[f.path];
      return summary ? `${f.path} — ${summary}` : f.path;
    }).join("\n");
    output += `\n</directory_structure>\n\n`;

    // File contents
    output += `<repository_files>\n\n`;
    for (const file of fileContents) {
      const lang = getLanguageFromExt(file.path);
      const lines = file.content.split("\n").length;
      const summary = fileSummaries[file.path] || "";
      output += `<file path="${file.path}" lines="${lines}"${summary ? ` summary="${summary}"` : ""}>\n`;
      if (summary) output += `// ${summary}\n`;
      output += `\`\`\`${lang}\n${file.content}\n\`\`\`\n`;
      output += `</file>\n\n`;
    }
    output += `</repository_files>\n`;

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
