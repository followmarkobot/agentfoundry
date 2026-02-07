"use server";

type CreateIssueParams = {
  accessToken: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  labels?: string[];
};

type CreateIssueResult =
  | { success: true; issueUrl: string; issueNumber: number }
  | { error: string };

export async function createGitHubIssue(
  params: CreateIssueParams
): Promise<CreateIssueResult> {
  const { accessToken, owner, repo, title, description, labels } = params;

  if (!accessToken || !owner || !repo || !title) {
    return { error: "Missing required fields" };
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
      cache: "no-store",
      body: JSON.stringify({
        title,
        body: `${description}\n\n---\n*Created by [AgentFoundry](https://agentfoundry.dev) scan*`,
        labels: Array.isArray(labels) ? labels : [],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message || "Failed to create issue" };
  }

  const issue = await res.json();
  return {
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
  };
}
