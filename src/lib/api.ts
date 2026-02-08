const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export type ScanResult = {
  stage: "idea" | "prototype" | "mvp" | "growth" | "mature";
  stage_reasoning: string;
  top_recommendation: {
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: string;
  };
  secondary_recommendations: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: string;
  }>;
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

export async function createIssue(params: {
  accessToken: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  labels: string[];
}): Promise<{ issueUrl: string; issueNumber: number }> {
  const res = await fetch(`${BASE_URL}/api/create-issue`, {
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
