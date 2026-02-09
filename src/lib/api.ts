const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export type Recommendation = {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: string;
  relevant_files: string[];
};

export type ScanResult = {
  stage: "idea" | "prototype" | "mvp" | "growth" | "mature";
  stage_reasoning: string;
  top_recommendation: Recommendation;
  secondary_recommendations: Recommendation[];
};

export type ScanResponse = {
  success: boolean;
  analysis: ScanResult;
  meta: {
    filesScanned: number;
    totalFiles: number;
  };
};

export async function scanRepository(
  owner: string,
  repo: string,
  accessToken: string
): Promise<ScanResponse> {
  const res = await fetch(`${BASE_URL}/api/scan/${owner}/${repo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Scan failed");
  }
  return data;
}

export type PackResponse = {
  success: boolean;
  content: string;
  meta: {
    filesIncluded: number;
    totalFiles: number;
    lines?: number;
    chars?: number;
    words?: number;
    sizeKB?: number;
    estimatedTokens?: number;
  };
};

export async function packRepository(
  owner: string,
  repo: string,
  accessToken: string
): Promise<PackResponse> {
  const res = await fetch(`${BASE_URL}/api/pack/${owner}/${repo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Pack failed");
  return data;
}

export type ChatRequest = {
  recommendation: Recommendation;
  userMessage: string;
  relevantFiles: string[];
  repoContext: {
    owner: string;
    repo: string;
    stage: string;
    stageReasoning: string;
    accessToken: string;
  };
};

export type ChatResponse = {
  reply: string;
};

export async function chatAboutRecommendation(
  params: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Chat failed");
  return data;
}

export async function createIssue(params: {
  accessToken: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  labels: string[];
}): Promise<{ issueUrl: string; issueNumber: number }> {
  const url = `${BASE_URL}/api/create-issue`;
  console.log("[createIssue] URL:", url, "BASE_URL:", JSON.stringify(BASE_URL), "params:", JSON.stringify(params).slice(0, 100));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create issue");
  }
  return data;
}
