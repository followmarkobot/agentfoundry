import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "issues route alive" });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    console.log("Issues route hit");
    const { owner, repo } = await context.params;
    const { accessToken, title, description, labels } = await req.json();

    if (!accessToken || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body: `${description}\n\n---\n*Created by [AgentFoundry](https://agentfoundry.dev) scan*`,
          labels: labels || [],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Failed to create issue" },
        { status: res.status }
      );
    }

    const issue = await res.json();
    return NextResponse.json({
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
