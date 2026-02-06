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

export default function RepoCard({ repo }: { repo: Repo }) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-4">
        <img
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          className="h-12 w-12 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-zinc-900 truncate">
            {repo.name}
          </h3>
          <p className="text-sm text-zinc-500">{repo.owner.login}</p>
        </div>
      </div>

      {/* Stats row */}
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

      {/* CTA Buttons */}
      <div className="mt-4 flex items-center gap-3">
        <button
          className="flex flex-1 items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Scan Repository
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
