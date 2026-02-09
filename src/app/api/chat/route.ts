import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recommendation, userMessage, relevantFiles, repoContext } = body;
  if (!recommendation || !userMessage || !repoContext?.accessToken) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { owner, repo, stage, stageReasoning, accessToken } = repoContext;

  // Fetch only the relevant files
  const filePaths: string[] = relevantFiles || recommendation.relevant_files || [];
  const fileContents: string[] = [];

  const results = await Promise.all(
    filePaths.slice(0, 10).map(async (path: string) => {
      const content = await fetchGitHubFile(owner, repo, path, accessToken);
      return content ? `=== ${path} ===\n${content}` : null;
    })
  );
  fileContents.push(...results.filter((r): r is string => r !== null));

  const prompt = `You are a code advisor. The user is looking at a recommendation for their repository and has a follow-up question or feedback.

Repository: ${owner}/${repo}
Stage: ${stage}
Stage reasoning: ${stageReasoning}

Recommendation:
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}
- Effort: ${recommendation.effort}

Relevant source files:
${fileContents.join("\n\n")}

User message: ${userMessage}

Respond helpfully and concisely. If the user says the recommendation is wrong, acknowledge it and suggest an alternative. If they ask for more detail, provide specific code-level guidance referencing the files above. Keep your response under 300 words.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
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
    const messageOutput = data.output?.find((o: { type: string }) => o.type === "message");
    const reply = messageOutput?.content?.[0]?.text || "No response generated.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
