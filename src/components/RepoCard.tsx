"use client";

import React, { useState, useRef } from "react";
import { scanRepository, createIssue, type ScanResponse } from "@/lib/api";

export type Repo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-green-500",
    Rust: "bg-orange-500",
    Go: "bg-cyan-500",
    Ruby: "bg-red-500",
    Java: "bg-red-600",
    "C++": "bg-pink-500",
    C: "bg-gray-500",
    Swift: "bg-orange-400",
    Kotlin: "bg-purple-500",
  };
  return colors[language || ""] || "bg-zinc-400";
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    idea: "bg-purple-100 text-purple-700 border-purple-200",
    prototype: "bg-blue-100 text-blue-700 border-blue-200",
    mvp: "bg-yellow-100 text-yellow-700 border-yellow-200",
    growth: "bg-green-100 text-green-700 border-green-200",
    mature: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return colors[stage] || "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function getImpactColor(impact: string): string {
  const colors: Record<string, string> = {
    high: "text-red-600 bg-red-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-green-600 bg-green-50",
  };
  return colors[impact] || "text-zinc-600 bg-zinc-50";
}

function CreateIssueButton({
  state,
  issueKey,
  onCreateIssue,
}: {
  state?: { loading?: boolean; url?: string; error?: string };
  issueKey: string;
  onCreateIssue: (key: string) => void;
}) {
  if (state?.url) {
    return (
      <a
        href={state.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-green-500 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition"
      >
        View Issue →
      </a>
    );
  }
  if (state?.error) {
    return (
      <span className="text-xs text-red-500" title={state.error}>
        ✕ Failed
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state?.loading) return;
        onCreateIssue(issueKey);
      }}
      disabled={state?.loading}
      className="inline-flex items-center gap-1 rounded-md border border-green-400 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition disabled:opacity-50"
    >
      {state?.loading ? (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        "Create Issue"
      )}
    </button>
  );
}

export default function RepoCard({
  repo,
  accessToken,
  isPinned,
  isArchived,
  onTogglePin,
  onToggleArchive,
}: {
  repo: Repo;
  accessToken?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  onTogglePin?: (repoId: number) => void;
  onToggleArchive?: (repoId: number) => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [issueStates, setIssueStates] = useState<
    Record<string, { loading?: boolean; url?: string; error?: string }>
  >({});

  const issuePendingRef = React.useRef<Record<string, boolean>>({});
  const recommendationsRef = React.useRef<Record<string, { title: string; description: string; impact: string }>>({});

  // Update recommendations ref when scan results change
  React.useEffect(() => {
    if (!scanResult) return;
    const rec = scanResult.analysis.top_recommendation;
    recommendationsRef.current["top"] = { title: rec.title, description: rec.description, impact: rec.impact };
    scanResult.analysis.secondary_recommendations.forEach((r, i) => {
      recommendationsRef.current[`sec-${i}`] = { title: r.title, description: r.description, impact: r.impact };
    });
  }, [scanResult]);

  async function handleCreateIssue(key: string) {
    const rec = recommendationsRef.current[key];
    if (!accessToken || !rec) return;
    if (issuePendingRef.current[key]) return;
    issuePendingRef.current[key] = true;
    const { title, description, impact } = rec;
    setIssueStates((s) => ({ ...s, [key]: { loading: true } }));
    try {
      const data = await createIssue({
        accessToken,
        owner: repo.owner.login,
        repo: repo.name,
        title,
        description,
        labels: ["agentfoundry", `${impact}-impact`],
      });
      setIssueStates((s) => ({ ...s, [key]: { url: data.issueUrl } }));
    } catch (err) {
      setIssueStates((s) => ({
        ...s,
        [key]: { error: err instanceof Error ? err.message : "Failed" },
      }));
    } finally {
      issuePendingRef.current[key] = false;
    }
  }

  async function handleScan() {
    if (!accessToken) {
      setScanError("Not authenticated");
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const data = await scanRepository(repo.owner.login, repo.name, accessToken);
      setScanResult(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <article className={`flex flex-col rounded-xl border p-5 shadow-sm transition hover:shadow-md ${isArchived ? "border-zinc-300 bg-zinc-50 opacity-60" : "border-zinc-200 bg-white"}`}>
      {/* Header: Avatar + Name + Pin/Archive */}
      <div className="flex items-start gap-4">
        <img
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          className="h-12 w-12 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900 truncate">
              {repo.name}
            </h3>
            {isPinned && (
              <span className="text-green-600" title="Pinned">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
              </span>
            )}
            {isArchived && (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase">Archived</span>
            )}
          </div>
          <p className="text-sm text-zinc-500">{repo.owner.login}</p>
        </div>
        {/* Pin/Archive buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onTogglePin && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePin(repo.id); }}
              title={isPinned ? "Unpin" : "Pin"}
              className={`rounded-md p-1.5 transition ${isPinned ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"}`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
            </button>
          )}
          {onToggleArchive && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleArchive(repo.id); }}
              title={isArchived ? "Unarchive" : "Archive"}
              className={`rounded-md p-1.5 transition ${isArchived ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-2-3H6L4 7m16 0v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7m16 0H4m5 4h6"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-600">
        <span className="flex items-center gap-1">
          <svg
            className="h-4 w-4 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {repo.stargazers_count}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          {repo.forks_count} forks
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-zinc-600 line-clamp-3 flex-1">
        {repo.description || "No description provided."}
      </p>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {repo.language && (
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            <span
              className={`h-2 w-2 rounded-full ${getLanguageColor(repo.language)}`}
            />
            {repo.language}
          </span>
        )}
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          Updated {formatDate(repo.updated_at)}
        </span>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          {/* Stage Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStageColor(scanResult.analysis.stage)}`}
            >
              {scanResult.analysis.stage.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-500">
              {scanResult.meta.filesScanned} / {scanResult.meta.totalFiles}{" "}
              files scanned
            </span>
          </div>

          {/* Stage Reasoning */}
          <p className="text-sm text-zinc-600 mb-4">
            {scanResult.analysis.stage_reasoning}
          </p>

          {/* Top Recommendation */}
          <div className="bg-white rounded-lg border border-zinc-200 p-4 mb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-zinc-900">
                🎯 {scanResult.analysis.top_recommendation.title}
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${getImpactColor(scanResult.analysis.top_recommendation.impact)}`}
              >
                {scanResult.analysis.top_recommendation.impact} impact
              </span>
            </div>
            <p className="text-sm text-zinc-600 mb-2">
              {scanResult.analysis.top_recommendation.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-500">
                ⏱️ Effort: {scanResult.analysis.top_recommendation.effort}
              </p>
              <CreateIssueButton
                state={issueStates["top"]}
                issueKey="top"
                onCreateIssue={handleCreateIssue}
              />
            </div>
          </div>

          {/* Secondary Recommendations (Collapsible) */}
          {scanResult.analysis.secondary_recommendations.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowSecondary(!showSecondary)}
                className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 transition"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${showSecondary ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {scanResult.analysis.secondary_recommendations.length} more
                recommendations
              </button>

              {showSecondary && (
                <div className="mt-2 space-y-2">
                  {scanResult.analysis.secondary_recommendations.map(
                    (rec, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg border border-zinc-100 p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h5 className="font-medium text-sm text-zinc-800">
                            {rec.title}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getImpactColor(rec.impact)}`}
                          >
                            {rec.impact}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          {rec.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500">
                            ⏱️ {rec.effort}
                          </p>
                          <CreateIssueButton
                            state={issueStates[`sec-${i}`]}
                            issueKey={`sec-${i}`}
                            onCreateIssue={handleCreateIssue}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {scanError && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{scanError}</p>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleScan}
          disabled={isScanning || !accessToken}
          className={`flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            isScanning || !accessToken
              ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isScanning ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Scanning...
            </>
          ) : scanResult ? (
            "Rescan Repository"
          ) : (
            "Scan Repository"
          )}
        </button>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-700"
        >
          View on GitHub
        </a>
      </div>
    </article>
  );
}
