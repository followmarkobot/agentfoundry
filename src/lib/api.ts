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
  optimization_goal: string;
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
  packContent?: string;
  packMeta?: {
    filesIncluded: number;
    totalFiles: number;
    lines?: number;
    chars?: number;
    words?: number;
    sizeKB?: number;
    estimatedTokens?: number;
  };
};

export async function analyzeRepository(
  owner: string,
  repo: string,
  accessToken: string
): Promise<ScanResponse> {
  const res = await fetch(`${BASE_URL}/api/scan/${owner}/${repo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, includePack: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Analysis failed");
  return data;
}

// Keep old function for backward compat
export const scanRepository = analyzeRepository;

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

export type FeedbackType = "helpful" | "not_relevant" | "dont_understand" | "later" | "already_done";

export type ExplainResponse = {
  simplified: string;
  codeReferences: string[];
  whyItMatters: string;
};

export async function explainRecommendation(params: {
  recommendation: Recommendation;
  relevantFiles: string[];
  followUp?: string;
  repoContext: {
    owner: string;
    repo: string;
    stage: string;
    stageReasoning: string;
    accessToken: string;
  };
}): Promise<ExplainResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, mode: "explain" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Explain failed");
  return data;
}

export type OverrideResponse = {
  newRecommendations: Recommendation[];
  reorderedExisting: boolean;
};

export async function overrideRecommendations(params: {
  userGoal: string;
  existingRecommendations: Recommendation[];
  repoContext: {
    owner: string;
    repo: string;
    stage: string;
    stageReasoning: string;
    accessToken: string;
  };
}): Promise<OverrideResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, mode: "override" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Override failed");
  return data;
}

export type ReoptimizeResponse = {
  recommendations: Recommendation[];
  optimization_goal: string;
};

export async function reoptimizeForGoal(params: {
  goal: string;
  existingRecommendations: Recommendation[];
  repoContext: {
    owner: string;
    repo: string;
    stage: string;
    stageReasoning: string;
    accessToken: string;
  };
}): Promise<ReoptimizeResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, mode: "reoptimize" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reoptimize failed");
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
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create issue");
  return data;
}

// localStorage helpers for feedback
const FEEDBACK_KEY = "agentfoundry_feedback";
const CACHE_KEY = "agentfoundry_analysis_cache";

export function getFeedback(repoFullName: string, recTitle: string): FeedbackType | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}");
    return all[`${repoFullName}::${recTitle}`] || null;
  } catch { return null; }
}

export function setFeedback(repoFullName: string, recTitle: string, feedback: FeedbackType | null): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}");
    const key = `${repoFullName}::${recTitle}`;
    if (feedback === null) delete all[key];
    else all[key] = feedback;
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function getCachedAnalysis(repoFullName: string): ScanResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const entry = all[repoFullName];
    if (!entry) return null;
    // Cache for 1 hour
    if (Date.now() - entry.timestamp > 3600000) return null;
    return entry.data;
  } catch { return null; }
}

export function setCachedAnalysis(repoFullName: string, data: ScanResponse): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    all[repoFullName] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
