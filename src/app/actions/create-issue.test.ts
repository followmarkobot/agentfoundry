import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitHubIssue } from "./create-issue";

describe("createGitHubIssue", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls the GitHub issues endpoint and does not 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        html_url: "https://github.com/octo/demo/issues/123",
        number: 123,
      }),
    });

    global.fetch = fetchMock as typeof global.fetch;

    const result = await createGitHubIssue({
      accessToken: "ghp_test",
      owner: "octo",
      repo: "demo",
      title: "Test issue",
      description: "Test description",
      labels: ["agentfoundry"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/octo/demo/issues",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        issueUrl: "https://github.com/octo/demo/issues/123",
        issueNumber: 123,
      })
    );
  });
});
