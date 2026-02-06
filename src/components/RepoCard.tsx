export type Repo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function RepoCard({ repo }: { repo: Repo }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{repo.name}</h3>
          <p className="mt-2 text-sm text-zinc-600">
            {repo.description || "No description provided."}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
          {repo.language || "Unknown"}
        </span>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-600">
          ★ {repo.stargazers_count}
        </span>
        <span>Updated {formatDate(repo.updated_at)}</span>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-semibold text-zinc-800 hover:text-black"
        >
          View repo
        </a>
      </div>
    </article>
  );
}
