import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import RepoGrid from "@/components/RepoGrid";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Repo } from "@/components/RepoCard";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

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
    <div className="min-h-screen bg-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-12">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            AgentFoundry
          </Link>
          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm font-medium text-zinc-700">
              {session.user?.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-6 py-3 text-sm md:px-12">
          <Link href="/" className="text-zinc-500 hover:text-zinc-700">
            Home
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="font-medium text-zinc-900">Your Repositories</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Your Repositories
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Browse and manage your GitHub repositories
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            {repos.length} repos
          </span>
        </div>

        <RepoGrid repos={repos} />
      </div>
    </div>
  );
}
