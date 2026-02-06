import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import RepoGrid from "@/components/RepoGrid";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Repo } from "@/components/RepoCard";

async function fetchRepos(token: string): Promise<Repo[]> {
  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const accessToken = (session as { accessToken?: string }).accessToken;

  if (!accessToken) {
    redirect("/");
  }

  const repos = await fetchRepos(accessToken);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-10 md:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Your GitHub repos
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Repo Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Browse your repositories and jump into the ones you are shipping now.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-600">
          {repos.length} repos
        </span>
      </div>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-12">
        <RepoGrid repos={repos} />
      </div>
    </div>
  );
}
