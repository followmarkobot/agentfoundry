"use client";

import { useState, useMemo } from "react";
import RepoCard, { Repo } from "./RepoCard";

type SortOption = "updated" | "stars" | "name" | "created";

const sortLabels: Record<SortOption, string> = {
  updated: "Recently updated",
  stars: "Stars (high → low)",
  name: "Name (A → Z)",
  created: "Created date",
};

export default function DashboardControls({
  repos,
  accessToken,
}: {
  repos: Repo[];
  accessToken?: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [filterHasDescription, setFilterHasDescription] = useState(false);
  const [filterHasStars, setFilterHasStars] = useState(false);
  const [filterVisibility, setFilterVisibility] = useState<"all" | "public" | "private">("all");

  // Auto-detect languages
  const languages = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach((r) => r.language && langs.add(r.language));
    return Array.from(langs).sort();
  }, [repos]);

  // Determine active state
  const hasSearch = search.trim().length > 0;
  const hasFilters = selectedLanguages.size > 0 || filterHasDescription || filterHasStars || filterVisibility !== "all";
  const activeCount = (hasSearch ? 1 : 0) + (selectedLanguages.size) + (filterHasDescription ? 1 : 0) + (filterHasStars ? 1 : 0) + (filterVisibility !== "all" ? 1 : 0);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...repos];

    // Search
    if (hasSearch) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.full_name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // Language filter
    if (selectedLanguages.size > 0) {
      result = result.filter((r) => r.language && selectedLanguages.has(r.language));
    }

    // Has description
    if (filterHasDescription) {
      result = result.filter((r) => r.description && r.description.trim().length > 0);
    }

    // Has stars
    if (filterHasStars) {
      result = result.filter((r) => r.stargazers_count > 0);
    }

    // Visibility
    if (filterVisibility === "public") {
      result = result.filter((r) => !(r as any).private);
    } else if (filterVisibility === "private") {
      result = result.filter((r) => (r as any).private);
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "stars":
          return b.stargazers_count - a.stargazers_count;
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date((b as any).created_at || b.updated_at).getTime() - new Date((a as any).created_at || a.updated_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [repos, search, sort, selectedLanguages, filterHasDescription, filterHasStars, filterVisibility, hasSearch]);

  function toggleLanguage(lang: string) {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      return next;
    });
  }

  function clearAll() {
    setSearch("");
    setSelectedLanguages(new Set());
    setFilterHasDescription(false);
    setFilterHasStars(false);
    setFilterVisibility("all");
  }

  // Build empty state message
  function emptyMessage(): string {
    const parts: string[] = [];
    if (hasSearch) parts.push(`matching "${search.trim()}"`);
    if (selectedLanguages.size > 0) parts.push(`in ${Array.from(selectedLanguages).join(", ")}`);
    if (filterHasDescription) parts.push("with descriptions");
    if (filterHasStars) parts.push("with stars");
    if (filterVisibility !== "all") parts.push(`(${filterVisibility})`);
    return `No repos found ${parts.join(" ")}`;
  }

  return (
    <>
      {/* Controls Bar */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        {/* Top row: search + sort */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition"
            />
            {hasSearch && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition whitespace-nowrap"
            >
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h12M3 17h6" />
              </svg>
              {sortLabels[sort]}
              <svg className={`h-3 w-3 text-zinc-400 transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setSortOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm transition ${sort === key ? "bg-green-50 text-green-700 font-medium" : "text-zinc-700 hover:bg-zinc-50"}`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider mr-1">Filters</span>

          {/* Language chips */}
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => toggleLanguage(lang)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                selectedLanguages.has(lang)
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {lang}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-zinc-200" />

          {/* Has description */}
          <button
            onClick={() => setFilterHasDescription(!filterHasDescription)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              filterHasDescription
                ? "border-green-400 bg-green-50 text-green-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            Has description
          </button>

          {/* Has stars */}
          <button
            onClick={() => setFilterHasStars(!filterHasStars)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              filterHasStars
                ? "border-green-400 bg-green-50 text-green-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            Has stars ★
          </button>

          {/* Visibility */}
          <button
            onClick={() => setFilterVisibility(filterVisibility === "all" ? "public" : filterVisibility === "public" ? "private" : "all")}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              filterVisibility !== "all"
                ? "border-green-400 bg-green-50 text-green-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {filterVisibility === "all" ? "Visibility" : filterVisibility === "public" ? "Public" : "Private"}
          </button>

          {/* Clear all */}
          {(hasSearch || hasFilters) && (
            <button onClick={clearAll} className="ml-auto text-xs text-zinc-500 hover:text-zinc-700 transition underline">
              Clear all ({activeCount})
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {(hasSearch || hasFilters) && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <span>Showing <strong className="text-zinc-700">{filtered.length}</strong> of {repos.length} repos</span>
          {hasSearch && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              Search: &quot;{search.trim()}&quot;
            </span>
          )}
        </div>
      )}

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-500 text-sm">{emptyMessage()}</p>
          <button onClick={clearAll} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} accessToken={accessToken} />
          ))}
        </div>
      )}
    </>
  );
}
