"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  analyzeRepository,
  createIssue,
  explainRecommendation,
  overrideRecommendations,
  reoptimizeForGoal,
  getFeedback,
  setFeedback,
  getCachedAnalysis,
  setCachedAnalysis,
  type ScanResponse,
  type Recommendation,
  type FeedbackType,
  type ExplainResponse,
} from "@/lib/api";

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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
    Rust: "bg-orange-500", Go: "bg-cyan-500", Ruby: "bg-red-500", Java: "bg-red-600",
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
    high: "text-red-600 bg-red-50", medium: "text-yellow-600 bg-yellow-50", low: "text-green-600 bg-green-50",
  };
  return colors[impact] || "text-zinc-600 bg-zinc-50";
}

// === Feedback Buttons ===
const FEEDBACK_OPTIONS: { type: FeedbackType; emoji: string; label: string }[] = [
  { type: "helpful", emoji: "👍", label: "Helpful" },
  { type: "not_relevant", emoji: "👎", label: "Not relevant" },
  { type: "dont_understand", emoji: "❓", label: "I don't understand this" },
  { type: "later", emoji: "🕒", label: "Later" },
  { type: "already_done", emoji: "✅", label: "Already done" },
];

function FeedbackButtons({
  repoFullName,
  recTitle,
  currentFeedback,
  onFeedback,
}: {
  repoFullName: string;
  recTitle: string;
  currentFeedback: FeedbackType | null;
  onFeedback: (recTitle: string, feedback: FeedbackType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {FEEDBACK_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={(e) => { e.stopPropagation(); onFeedback(recTitle, opt.type); }}
          title={opt.label}
          className={`rounded-md px-2 py-1 text-xs font-medium border transition ${
            currentFeedback === opt.type
              ? "border-green-400 bg-green-50 text-green-700 ring-1 ring-green-300"
              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          }`}
        >
          {opt.emoji} {opt.label}
        </button>
      ))}
    </div>
  );
}

// === Explain Panel (replaces chat) ===
function ExplainPanel({
  recommendation,
  owner,
  repo,
  stage,
  stageReasoning,
  accessToken,
}: {
  recommendation: Recommendation;
  owner: string;
  repo: string;
  stage: string;
  stageReasoning: string;
  accessToken: string;
}) {
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFollowUp, setActiveFollowUp] = useState<string | null>(null);

  const repoContext = { owner, repo, stage, stageReasoning, accessToken };

  const loadExplanation = useCallback(async (followUp?: string) => {
    setIsLoading(true);
    setError(null);
    if (followUp) setActiveFollowUp(followUp);
    try {
      const result = await explainRecommendation({
        recommendation,
        relevantFiles: recommendation.relevant_files,
        followUp,
        repoContext,
      });
      setExplanation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to explain");
    } finally {
      setIsLoading(false);
    }
  }, [recommendation, owner, repo, stage, stageReasoning, accessToken]);

  useEffect(() => {
    loadExplanation();
  }, [loadExplanation]);

  if (isLoading && !explanation) {
    return (
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Simplifying explanation...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="mt-3 border-t border-blue-100 pt-3 space-y-2">
      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
        <p className="text-sm text-zinc-800">{explanation.simplified}</p>
        {explanation.codeReferences.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1">📁 Code references:</p>
            <ul className="text-xs text-zinc-600 space-y-0.5">
              {explanation.codeReferences.map((ref, i) => (
                <li key={i} className="font-mono bg-white rounded px-1.5 py-0.5 border border-zinc-100">{ref}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1">
          💡 Why this matters: {explanation.whyItMatters}
        </p>
      </div>

      {/* Structured follow-up buttons */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "show_code", label: "Show where in my code" },
          { key: "show_example", label: "Show an example" },
          { key: "explain_simple", label: "Explain like I'm new to this stack" },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); loadExplanation(btn.key); }}
            disabled={isLoading}
            className={`rounded-md px-2.5 py-1 text-xs font-medium border transition ${
              activeFollowUp === btn.key
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-blue-300 hover:text-blue-600"
            } disabled:opacity-50`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      )}
    </div>
  );
}

// === AI Format Icon ===
function AIFormatIcon({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="View packed context"
      className="rounded p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    </button>
  );
}

// === Single Recommendation Card ===
function RecommendationCard({
  recommendation,
  recKey,
  repoFullName,
  owner,
  repo,
  stage,
  stageReasoning,
  accessToken,
  issueState,
  onCreateIssue,
  onViewAIFormat,
}: {
  recommendation: Recommendation;
  recKey: string;
  repoFullName: string;
  owner: string;
  repo: string;
  stage: string;
  stageReasoning: string;
  accessToken: string;
  issueState?: { loading?: boolean; url?: string; error?: string };
  onCreateIssue: (key: string) => void;
  onViewAIFormat: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedbackState] = useState<FeedbackType | null>(() =>
    getFeedback(repoFullName, recommendation.title)
  );
  const [showExplain, setShowExplain] = useState(false);

  const handleFeedback = useCallback((recTitle: string, fb: FeedbackType) => {
    const newFb = feedback === fb ? null : fb;
    setFeedbackState(newFb);
    setFeedback(repoFullName, recTitle, newFb);
    if (fb === "dont_understand") {
      setExpanded(true);
      setShowExplain(true);
    } else {
      setShowExplain(false);
    }
  }, [feedback, repoFullName]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const cardClass = feedback === "already_done"
    ? "opacity-50"
    : feedback === "helpful"
    ? "ring-1 ring-green-200"
    : feedback === "not_relevant"
    ? "opacity-70"
    : "";

  return (
    <div className={`bg-white rounded-lg border border-zinc-200 transition ${cardClass}`}>
      {/* Header — always visible */}
      <div
        className="flex items-start justify-between gap-2 p-4 cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 text-zinc-400 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h5 className="font-medium text-sm text-zinc-800 truncate">
              {recommendation.title}
            </h5>
            <AIFormatIcon onClick={(e) => { e.stopPropagation(); onViewAIFormat(); }} />
          </div>
          {!expanded && (
            <p className="text-xs text-zinc-500 mt-1 ml-6 line-clamp-1">
              {recommendation.description}
            </p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${getImpactColor(recommendation.impact)}`}>
          {recommendation.impact}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-zinc-600">{recommendation.description}</p>

          {/* Evidence: file paths */}
          {recommendation.relevant_files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Related files:</p>
              <div className="flex flex-wrap gap-1">
                {recommendation.relevant_files.map((f) => (
                  <span key={f} className="text-xs font-mono bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-600">{f}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">⏱️ {recommendation.effort}</p>
            {issueState?.url ? (
              <a href={issueState.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-green-500 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition">
                View Issue →
              </a>
            ) : issueState?.error ? (
              <span className="text-xs text-red-500" title={issueState.error}>✕ Failed</span>
            ) : (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); onCreateIssue(recKey); }}
                disabled={issueState?.loading}
                className="inline-flex items-center gap-1 rounded-md border border-green-400 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition disabled:opacity-50">
                {issueState?.loading ? "..." : "Create Issue"}
              </button>
            )}
          </div>

          {/* Feedback buttons */}
          <FeedbackButtons
            repoFullName={repoFullName}
            recTitle={recommendation.title}
            currentFeedback={feedback}
            onFeedback={handleFeedback}
          />

          {/* Explain panel (shown when "I don't understand" is active) */}
          {showExplain && accessToken && (
            <ExplainPanel
              recommendation={recommendation}
              owner={owner}
              repo={repo}
              stage={stage}
              stageReasoning={stageReasoning}
              accessToken={accessToken}
            />
          )}
        </div>
      )}
    </div>
  );
}

// === Main RepoCard ===
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [issueStates, setIssueStates] = useState<Record<string, { loading?: boolean; url?: string; error?: string }>>({});
  const [showPackModal, setShowPackModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [showEscapeHatch, setShowEscapeHatch] = useState(false);
  const [escapeInput, setEscapeInput] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideRecs, setOverrideRecs] = useState<Recommendation[] | null>(null);
  const [showPreviousRecs, setShowPreviousRecs] = useState(false);

  const issuePendingRef = React.useRef<Record<string, boolean>>({});
  const recommendationsRef = React.useRef<Record<string, { title: string; description: string; impact: string }>>({});

  // Load cached result on mount
  useEffect(() => {
    const cached = getCachedAnalysis(repo.full_name);
    if (cached) setScanResult(cached);
  }, [repo.full_name]);

  React.useEffect(() => {
    if (!scanResult) return;
    const rec = scanResult.analysis.top_recommendation;
    recommendationsRef.current["top"] = { title: rec.title, description: rec.description, impact: rec.impact };
    scanResult.analysis.secondary_recommendations.forEach((r, i) => {
      recommendationsRef.current[`sec-${i}`] = { title: r.title, description: r.description, impact: r.impact };
    });
  }, [scanResult]);

  const handleCreateIssue = useCallback(async (key: string) => {
    const rec = recommendationsRef.current[key];
    if (!accessToken || !rec || issuePendingRef.current[key]) return;
    issuePendingRef.current[key] = true;
    setIssueStates((s) => ({ ...s, [key]: { loading: true } }));
    try {
      const data = await createIssue({
        accessToken, owner: repo.owner.login, repo: repo.name,
        title: rec.title, description: rec.description, labels: ["agentfoundry", `${rec.impact}-impact`],
      });
      setIssueStates((s) => ({ ...s, [key]: { url: data.issueUrl } }));
    } catch (err) {
      setIssueStates((s) => ({ ...s, [key]: { error: err instanceof Error ? err.message : "Failed" } }));
    } finally {
      issuePendingRef.current[key] = false;
    }
  }, [accessToken, repo.owner.login, repo.name]);

  const handleAnalyze = useCallback(async () => {
    if (!accessToken) { setScanError("Not authenticated"); return; }
    setIsAnalyzing(true);
    setScanError(null);
    try {
      const data = await analyzeRepository(repo.owner.login, repo.name, accessToken);
      setScanResult(data);
      setCachedAnalysis(repo.full_name, data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [accessToken, repo.owner.login, repo.name, repo.full_name]);

  const handleCopy = useCallback(async () => {
    if (!scanResult?.packContent) return;
    await navigator.clipboard.writeText(scanResult.packContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [scanResult]);

  const handleViewAIFormat = useCallback(() => {
    if (scanResult?.packContent) {
      setShowPackModal(true);
    }
  }, [scanResult]);

  const GOAL_OPTIONS = [
    "Shipping an MVP fast",
    "Reducing production risk",
    "Developer experience",
    "Scaling for growth",
    "Code quality & maintainability",
    "Security hardening",
  ];

  const handleChangeGoal = useCallback(async (goal: string) => {
    if (!accessToken || !scanResult) return;
    setShowGoalSelector(false);
    setIsReoptimizing(true);
    try {
      const result = await reoptimizeForGoal({
        goal,
        existingRecommendations: [
          scanResult.analysis.top_recommendation,
          ...scanResult.analysis.secondary_recommendations,
        ],
        repoContext: {
          owner: repo.owner.login, repo: repo.name,
          stage: scanResult.analysis.stage, stageReasoning: scanResult.analysis.stage_reasoning,
          accessToken,
        },
      });
      setScanResult((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          analysis: {
            ...prev.analysis,
            optimization_goal: result.optimization_goal,
            top_recommendation: result.recommendations[0] || prev.analysis.top_recommendation,
            secondary_recommendations: result.recommendations.slice(1),
          },
        };
        setCachedAnalysis(repo.full_name, updated);
        return updated;
      });
    } catch (err) {
      console.error("Reoptimize failed:", err);
    } finally {
      setIsReoptimizing(false);
    }
  }, [accessToken, scanResult, repo.owner.login, repo.name, repo.full_name]);

  const handleOverride = useCallback(async () => {
    if (!accessToken || !scanResult || !escapeInput.trim()) return;
    setIsOverriding(true);
    try {
      const result = await overrideRecommendations({
        userGoal: escapeInput.trim(),
        existingRecommendations: [
          scanResult.analysis.top_recommendation,
          ...scanResult.analysis.secondary_recommendations,
        ],
        repoContext: {
          owner: repo.owner.login, repo: repo.name,
          stage: scanResult.analysis.stage, stageReasoning: scanResult.analysis.stage_reasoning,
          accessToken,
        },
      });
      if (result.reorderedExisting) {
        setScanResult((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            analysis: {
              ...prev.analysis,
              top_recommendation: result.newRecommendations[0] || prev.analysis.top_recommendation,
              secondary_recommendations: result.newRecommendations.slice(1),
            },
          };
          setCachedAnalysis(repo.full_name, updated);
          return updated;
        });
      } else {
        setOverrideRecs(result.newRecommendations);
      }
      setEscapeInput("");
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setIsOverriding(false);
    }
  }, [accessToken, scanResult, escapeInput, repo.owner.login, repo.name, repo.full_name]);

  const allRecommendations = scanResult ? [
    scanResult.analysis.top_recommendation,
    ...scanResult.analysis.secondary_recommendations,
  ] : [];

  return (
    <>
      {/* Pack Modal */}
      {showPackModal && scanResult?.packContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPackModal(false)}>
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">AI Format — {repo.full_name}</h2>
                {scanResult.packMeta && (
                  <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
                    <span>{scanResult.packMeta.filesIncluded} / {scanResult.packMeta.totalFiles} files</span>
                    {scanResult.packMeta.lines && <span>📝 {scanResult.packMeta.lines.toLocaleString()} lines</span>}
                    {scanResult.packMeta.estimatedTokens && <span>🤖 ~{scanResult.packMeta.estimatedTokens.toLocaleString()} tokens</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition">
                  {copied ? "✓ Copied!" : "Copy to Clipboard"}
                </button>
                <button onClick={() => setShowPackModal(false)} className="rounded-lg p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap break-words text-sm text-zinc-800 font-mono bg-zinc-50 rounded-lg p-4 border border-zinc-200">{scanResult.packContent}</pre>
            </div>
          </div>
        </div>
      )}

      <article className={`flex flex-col rounded-xl border p-5 shadow-sm transition hover:shadow-md ${isArchived ? "border-zinc-300 bg-zinc-50 opacity-60" : "border-zinc-200 bg-white"}`}>
        {/* Header */}
        <div className="flex items-start gap-4">
          <img src={repo.owner.avatar_url} alt={repo.owner.login} className="h-12 w-12 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900 truncate">{repo.name}</h3>
              {isPinned && (
                <span className="text-green-600" title="Pinned">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                </span>
              )}
              {isArchived && <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase">Archived</span>}
            </div>
            <p className="text-sm text-zinc-500">{repo.owner.login}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onTogglePin && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onTogglePin(repo.id); }}
                title={isPinned ? "Unpin" : "Pin"}
                className={`rounded-md p-1.5 transition ${isPinned ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"}`}>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
              </button>
            )}
            {onToggleArchive && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onToggleArchive(repo.id); }}
                title={isArchived ? "Unarchive" : "Archive"}
                className={`rounded-md p-1.5 transition ${isArchived ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-2-3H6L4 7m16 0v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7m16 0H4m5 4h6"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm text-zinc-600">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {repo.stargazers_count}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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
              <span className={`h-2 w-2 rounded-full ${getLanguageColor(repo.language)}`} />
              {repo.language}
            </span>
          )}
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            Updated {formatDate(repo.updated_at)}
          </span>
        </div>

        {/* Analysis Results */}
        {scanResult && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            {/* Optimization Label */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500">Optimized for:</span>
              <span className="text-xs font-semibold text-zinc-700">
                {isReoptimizing ? "Reoptimizing..." : (scanResult.analysis.optimization_goal || "General improvement")}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowGoalSelector(!showGoalSelector); }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  (change)
                </button>
                {showGoalSelector && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowGoalSelector(false)} />
                    <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                      {GOAL_OPTIONS.map((goal) => (
                        <button key={goal} type="button"
                          onClick={(e) => { e.stopPropagation(); handleChangeGoal(goal); }}
                          className="w-full px-4 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 transition">
                          {goal}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stage Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStageColor(scanResult.analysis.stage)}`}>
                {scanResult.analysis.stage.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-500">
                {scanResult.meta.filesScanned} / {scanResult.meta.totalFiles} files
              </span>
            </div>

            <p className="text-sm text-zinc-600">{scanResult.analysis.stage_reasoning}</p>

            {/* Override recommendations (if any) */}
            {overrideRecs && overrideRecs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-700">Recommendations based on your input:</p>
                {overrideRecs.map((rec, i) => (
                  <RecommendationCard
                    key={`override-${i}`}
                    recommendation={rec}
                    recKey={`override-${i}`}
                    repoFullName={repo.full_name}
                    owner={repo.owner.login}
                    repo={repo.name}
                    stage={scanResult.analysis.stage}
                    stageReasoning={scanResult.analysis.stage_reasoning}
                    accessToken={accessToken || ""}
                    issueState={issueStates[`override-${i}`]}
                    onCreateIssue={handleCreateIssue}
                    onViewAIFormat={handleViewAIFormat}
                  />
                ))}
              </div>
            )}

            {/* Previous / main recommendations */}
            {overrideRecs ? (
              <div>
                <button type="button" onClick={() => setShowPreviousRecs(!showPreviousRecs)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 underline">
                  {showPreviousRecs ? "Hide previous recommendations" : "Previous recommendations (show)"}
                </button>
                {showPreviousRecs && (
                  <div className="mt-2 space-y-2">
                    {allRecommendations.map((rec, i) => {
                      const key = i === 0 ? "top" : `sec-${i - 1}`;
                      return (
                        <RecommendationCard
                          key={key}
                          recommendation={rec}
                          recKey={key}
                          repoFullName={repo.full_name}
                          owner={repo.owner.login}
                          repo={repo.name}
                          stage={scanResult.analysis.stage}
                          stageReasoning={scanResult.analysis.stage_reasoning}
                          accessToken={accessToken || ""}
                          issueState={issueStates[key]}
                          onCreateIssue={handleCreateIssue}
                          onViewAIFormat={handleViewAIFormat}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {allRecommendations.map((rec, i) => {
                  const key = i === 0 ? "top" : `sec-${i - 1}`;
                  return (
                    <RecommendationCard
                      key={key}
                      recommendation={rec}
                      recKey={key}
                      repoFullName={repo.full_name}
                      owner={repo.owner.login}
                      repo={repo.name}
                      stage={scanResult.analysis.stage}
                      stageReasoning={scanResult.analysis.stage_reasoning}
                      accessToken={accessToken || ""}
                      issueState={issueStates[key]}
                      onCreateIssue={handleCreateIssue}
                      onViewAIFormat={handleViewAIFormat}
                    />
                  );
                })}
              </div>
            )}

            {/* Escape Hatch */}
            <div className="border-t border-zinc-200 pt-3">
              {!showEscapeHatch ? (
                <button type="button" onClick={() => setShowEscapeHatch(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 transition">
                  Not what you need? Tell us what you&apos;re optimizing for →
                </button>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={escapeInput}
                    onChange={(e) => setEscapeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleOverride(); }}
                    placeholder="What are you optimizing for?"
                    className="flex-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <button type="button" onClick={handleOverride}
                    disabled={isOverriding || !escapeInput.trim()}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition disabled:opacity-50">
                    {isOverriding ? "..." : "Go"}
                  </button>
                  <button type="button" onClick={() => { setShowEscapeHatch(false); setEscapeInput(""); }}
                    className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {scanError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{scanError}</p>
          </div>
        )}

        {/* CTA: Single "Analyze" button */}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={handleAnalyze} disabled={isAnalyzing || !accessToken}
            className={`flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              isAnalyzing || !accessToken ? "bg-zinc-300 text-zinc-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
            }`}>
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : scanResult ? "Re-analyze" : "Analyze"}
          </button>
          <a href={repo.html_url} target="_blank" rel="noreferrer"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-700">
            GitHub
          </a>
        </div>
      </article>
    </>
  );
}
