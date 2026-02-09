import { NextRequest, NextResponse } from "next/server";
import { pack } from "repomix";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

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

async function fetchGitHubFile(owner: string, repo: string, filePath: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
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

function mkdirpSync(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
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

  const tmpDir = path.join(os.tmpdir(), `repomix-${owner}-${repo}-${Date.now()}`);
  const outFile = path.join(os.tmpdir(), `repomix-out-${owner}-${repo}-${Date.now()}.xml`);

  try {
    // Fetch file tree from GitHub
    const tree = await fetchFileTree(owner, repo, accessToken);
    const totalFilesInRepo = tree.filter(i => i.type === "blob").length;
    const sourceFiles = tree.filter((item) => item.type === "blob" && shouldIncludeFile(item.path)).slice(0, 100);

    // Download files to /tmp
    mkdirpSync(tmpDir);
    const batchSize = 10;
    let filesWritten = 0;

    for (let i = 0; i < sourceFiles.length; i += batchSize) {
      const batch = sourceFiles.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (file) => {
          const content = await fetchGitHubFile(owner, repo, file.path, accessToken);
          return { path: file.path, content };
        })
      );
      for (const r of results) {
        if (r.content) {
          const filePath = path.join(tmpDir, r.path);
          mkdirpSync(path.dirname(filePath));
          fs.writeFileSync(filePath, r.content);
          filesWritten++;
        }
      }
    }

    // Run repomix pack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repomixConfig: any = {
      cwd: tmpDir,
      input: { maxFileSize: 50 * 1024 * 1024 },
      output: {
        filePath: outFile,
        style: "xml",
        parsableStyle: false,
        fileSummary: true,
        directoryStructure: true,
        files: true,
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        topFilesLength: 5,
        showLineNumbers: false,
        truncateBase64: false,
        copyToClipboard: false,
        includeFullDirectoryStructure: false,
        tokenCountTree: false,
        git: {
          sortByChanges: false,
          sortByChangesMaxCommits: 100,
          includeDiffs: false,
          includeLogs: false,
          includeLogsCount: 0,
        },
      },
      include: [],
      ignore: {
        useGitignore: false,
        useDotIgnore: false,
        useDefaultPatterns: true,
        customPatterns: [],
      },
      security: { enableSecurityCheck: false },
      tokenCount: { encoding: "cl100k_base" },
    };
    const result = await pack([tmpDir], repomixConfig);

    // Read the output
    let content = "";
    if (fs.existsSync(outFile)) {
      content = fs.readFileSync(outFile, "utf8");
    }

    // Calculate stats from result + content
    const totalChars = content.length;
    const totalLines = content.split("\n").length;
    const totalWords = content.split(/\s+/).filter(Boolean).length;
    const totalBytes = Buffer.byteLength(content, "utf8");

    return NextResponse.json({
      success: true,
      content,
      meta: {
        filesIncluded: result.totalFiles || filesWritten,
        totalFiles: totalFilesInRepo,
        lines: totalLines,
        chars: totalChars,
        words: totalWords,
        sizeKB: Math.round(totalBytes / 1024),
        estimatedTokens: result.totalTokens || Math.round(totalChars / 4),
      },
    });
  } catch (error) {
    console.error("Pack error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pack failed" }, { status: 500 });
  } finally {
    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    } catch { /* ignore cleanup errors */ }
  }
}
