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

  let accessToken: string;
  try {
    const body = await request.json();
    accessToken = body.accessToken;
    if (!accessToken) return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const outFile = path.join(os.tmpdir(), `repomix-out-${owner}-${repo}-${Date.now()}.xml`);
  const credScript = path.join(os.tmpdir(), `git-cred-${Date.now()}.sh`);
  const prevAskPass = process.env.GIT_ASKPASS;
  const prevPrompt = process.env.GIT_TERMINAL_PROMPT;

  try {
    // Set up git credentials so repomix's clone works with private repos
    // GIT_ASKPASS is called with a prompt arg — "Username" or "Password"
    fs.writeFileSync(
      credScript,
      `#!/bin/sh\ncase "$1" in\n*sername*) echo "x-access-token";;\n*assword*) echo "${accessToken}";;\nesac`,
      { mode: 0o755 }
    );
    process.env.GIT_ASKPASS = credScript;
    process.env.GIT_TERMINAL_PROMPT = "0";

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
    // Restore env and clean up credential script
    if (prevAskPass === undefined) delete process.env.GIT_ASKPASS;
    else process.env.GIT_ASKPASS = prevAskPass;
    if (prevPrompt === undefined) delete process.env.GIT_TERMINAL_PROMPT;
    else process.env.GIT_TERMINAL_PROMPT = prevPrompt;
    try {
      if (fs.existsSync(credScript)) fs.unlinkSync(credScript);
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    } catch { /* ignore */ }
  }
}
