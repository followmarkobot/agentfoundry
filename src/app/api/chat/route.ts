import { NextRequest, NextResponse } from "next/server";

async function fetchGitHubFile(
  owner: string, repo: string, path: string, token: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" } }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function callOpenAI(openaiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "gpt-5.2-codex", input: prompt }),
  });
  if (!response.ok) {
    const errorData = await response.text();
    console.error("OpenAI API error:", errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const messageOutput = data.output?.find((o: { type: string }) => o.type === "message");
  return messageOutput?.content?.[0]?.text || "";
}

async function fetchFileContents(filePaths: string[], owner: string, repo: string, accessToken: string): Promise<string[]> {
  const results = await Promise.all(
    filePaths.slice(0, 10).map(async (path: string) => {
      const content = await fetchGitHubFile(owner, repo, path, accessToken);
      return content ? `=== ${path} ===\n${content}` : null;
    })
  );
  return results.filter((r): r is string => r !== null);
}

export async function POST(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mode = body.mode || "chat";

  // === EXPLAIN MODE ===
  if (mode === "explain") {
    const { recommendation, relevantFiles, followUp, repoContext } = body;
    if (!recommendation || !repoContext?.accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { owner, repo, stage, stageReasoning, accessToken } = repoContext;
    const fileContents = await fetchFileContents(relevantFiles || recommendation.relevant_files || [], owner, repo, accessToken);

    let followUpInstruction = "";
    if (followUp === "show_code") {
      followUpInstruction = "Focus on showing exactly WHERE in the code this applies. Quote specific lines and file paths.";
    } else if (followUp === "show_example") {
      followUpInstruction = "Show a concrete before/after code example of how to implement this recommendation.";
    } else if (followUp === "explain_simple") {
      followUpInstruction = "Explain this as if the developer is brand new to this tech stack. Use analogies and simple language.";
    }

    const prompt = `You are explaining a code recommendation to a developer who clicked "I don't understand this."

Repository: ${owner}/${repo} (Stage: ${stage})
Stage reasoning: ${stageReasoning}

Recommendation:
- Title: ${recommendation.title}
- Description: ${recommendation.description}
- Impact: ${recommendation.impact}
- Effort: ${recommendation.effort}

Relevant source files:
${fileContents.join("\n\n")}

${followUpInstruction}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "simplified": "A simpler, more concrete explanation of what this recommendation means and how to do it. 2-3 sentences max.",
  "codeReferences": ["file.ts:42 - description of what's relevant here", "other.ts:10 - why this matters"],
  "whyItMatters": "One sentence explaining the real-world impact of not doing this."
}`;

    try {
      const responseText = await callOpenAI(openaiKey, prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Explain error:", error);
      return NextResponse.json({ error: "Failed to explain" }, { status: 500 });
    }
  }

  // === OVERRIDE MODE ===
  if (mode === "override") {
    const { userGoal, existingRecommendations, repoContext } = body;
    if (!userGoal || !existingRecommendations || !repoContext?.accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { owner, repo, stage, stageReasoning } = repoContext;

    const existingList = existingRecommendations.map((r: { title: string; description: string }, i: number) =>
      `${i + 1}. ${r.title}: ${r.description}`
    ).join("\n");

    const prompt = `A developer is looking at recommendations for their ${stage}-stage repo (${owner}/${repo}) and said:
"${userGoal}"

Current recommendations:
${existingList}

Decide: can the existing recommendations be reordered to match what they want? If so, return them reordered. If the overlap is low, generate up to 3 NEW recommendations that match their goal.

Return ONLY valid JSON:
{
  "reorderedExisting": true or false,
  "newRecommendations": [
    {
      "title": "short title",
      "description": "what and why",
      "impact": "high|medium|low",
      "effort": "hours estimate",
      "relevant_files": []
    }
  ]
}

If reorderedExisting is true, newRecommendations should contain the SAME recommendations in a new order.
If false, newRecommendations should be 1-3 NEW recommendations labeled to match the user's goal.`;

    try {
      const responseText = await callOpenAI(openaiKey, prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Override error:", error);
      return NextResponse.json({ error: "Failed to override" }, { status: 500 });
    }
  }

  // === REOPTIMIZE MODE ===
  if (mode === "reoptimize") {
    const { goal, existingRecommendations, repoContext } = body;
    if (!goal || !existingRecommendations || !repoContext?.accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { owner, repo, stage } = repoContext;

    const existingList = existingRecommendations.map((r: { title: string; description: string }, i: number) =>
      `${i + 1}. ${r.title}: ${r.description}`
    ).join("\n");

    const prompt = `Reframe these recommendations for a ${stage}-stage repo (${owner}/${repo}) to optimize for: "${goal}"

Current recommendations:
${existingList}

Reorder and reframe the existing recommendations to best serve the goal "${goal}". You may slightly adjust descriptions to better frame them for this goal, but keep the core recommendations.

Return ONLY valid JSON:
{
  "optimization_goal": "${goal}",
  "recommendations": [
    {
      "title": "short title",
      "description": "reframed description",
      "impact": "high|medium|low",
      "effort": "hours estimate",
      "relevant_files": []
    }
  ]
}`;

    try {
      const responseText = await callOpenAI(openaiKey, prompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Reoptimize error:", error);
      return NextResponse.json({ error: "Failed to reoptimize" }, { status: 500 });
    }
  }

  // === DEFAULT CHAT MODE (legacy) ===
  const { recommendation, userMessage, relevantFiles, repoContext } = body;
  if (!recommendation || !userMessage || !repoContext?.accessToken) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const { owner, repo, stage, stageReasoning, accessToken } = repoContext;
  const fileContents = await fetchFileContents(relevantFiles || recommendation.relevant_files || [], owner, repo, accessToken);

  const prompt = `You are a code advisor. The user is looking at a recommendation for their repository.

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

Respond helpfully and concisely. Keep under 300 words.`;

  try {
    const reply = await callOpenAI(openaiKey, prompt);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chat failed" }, { status: 500 });
  }
}
