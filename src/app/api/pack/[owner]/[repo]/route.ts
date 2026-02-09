import { NextRequest, NextResponse } from "next/server";
import { runRemoteAction } from "repomix";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;
  const outFile = path.join(os.tmpdir(), `repomix-out-${owner}-${repo}-${Date.now()}.xml`);

  try {
    // runRemoteAction downloads the repo (archive or git clone) and packs it
    const result = await runRemoteAction(`${owner}/${repo}`, {
      style: "xml",
      output: outFile,
      // Suppress interactive prompts and clipboard
      copy: false,
    });

    // Read packed output from the file runRemoteAction copied to cwd
    // With explicit output path, it writes to temp then copies to cwd
    // The output filename comes from config
    const outputFileName = result.config.output.filePath;
    const outputPath = path.resolve(process.cwd(), outputFileName);

    // Try the cwd copy first, then the explicit outFile
    let content = "";
    if (fs.existsSync(outputPath)) {
      content = fs.readFileSync(outputPath, "utf8");
      fs.unlinkSync(outputPath);
    } else if (fs.existsSync(outFile)) {
      content = fs.readFileSync(outFile, "utf8");
    }

    const { packResult } = result;
    const totalBytes = Buffer.byteLength(content, "utf8");

    return NextResponse.json({
      success: true,
      content,
      meta: {
        filesIncluded: packResult.totalFiles,
        chars: packResult.totalCharacters,
        estimatedTokens: packResult.totalTokens,
        sizeKB: Math.round(totalBytes / 1024),
      },
    });
  } catch (error) {
    console.error("Pack error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pack failed" },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    } catch { /* ignore */ }
  }
}
