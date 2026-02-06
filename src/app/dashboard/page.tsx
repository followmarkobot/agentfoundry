import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import RepoGrid from "@/components/RepoGrid";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Repo } from "@/components/RepoCard";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

const categories = [
  {
    name: "Marketing",
    sections: [
      { title: "DIGITAL MARKETING & PR", items: ["Social Media Management", "Content Creation", "Email Marketing"] },
      { title: "SEARCH & SEO", items: ["SEO Optimization", "Keyword Research", "Link Building"] },
    ],
  },
  {
    name: "Development",
    sections: [
      { title: "WEB DEVELOPMENT", items: ["Frontend Development", "Backend Development", "Full Stack Development"] },
      { title: "MOBILE & APPS", items: ["iOS Development", "Android Development", "React Native"] },
    ],
  },
  {
    name: "Design & Creative",
    sections: [
      { title: "GRAPHIC DESIGN", items: ["Logo Design", "Brand Identity", "Print Design"] },
      { title: "WEB & UI DESIGN", items: ["Website Design", "UI/UX Design", "Mobile App Design"] },
    ],
  },
  {
    name: "Content & Writing",
    sections: [
      { title: "CONTENT CREATION", items: ["Blog Writing", "Copywriting", "Technical Writing"] },
      { title: "EDITING & PROOFREADING", items: ["Content Editing", "Proofreading", "Grammar Checking"] },
    ],
  },
  {
    name: "Business & Finance",
    sections: [
      { title: "BUSINESS OPERATIONS", items: ["Project Management", "Virtual Assistant", "Customer Service"] },
      { title: "FINANCIAL SERVICES", items: ["Accounting Automation", "Invoice Processing", "Expense Management"] },
    ],
  },
];

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
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold text-zinc-900">
              AgentFoundry
            </Link>

            {/* Browse Agents Dropdown - Hover based */}
            <div className="group relative">
              <button className="flex items-center gap-1 text-sm text-zinc-600 transition hover:text-zinc-900">
                Browse Agents
                <svg
                  className="h-4 w-4 transition-transform group-hover:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Mega Menu Dropdown */}
              <div className="invisible absolute left-0 top-full z-50 mt-4 w-[800px] rounded-xl border border-zinc-200 bg-white p-6 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-5 gap-6">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <h3 className="mb-4 text-sm font-semibold text-zinc-900">{category.name}</h3>
                      {category.sections.map((section) => (
                        <div key={section.title} className="mb-4">
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                            {section.title}
                          </p>
                          <ul className="space-y-1.5">
                            {section.items.map((item) => (
                              <li key={item}>
                                <Link
                                  href={`/search?q=${encodeURIComponent(item)}`}
                                  className="text-sm text-zinc-600 transition hover:text-zinc-900"
                                >
                                  {item}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="mt-6 flex items-center gap-8 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                    3000+ integrations ready
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    </svg>
                    Production-ready workflows
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    60-second setup
                  </span>
                </div>
              </div>
            </div>
          </div>
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

        <RepoGrid repos={repos} accessToken={accessToken} />
      </div>
    </div>
  );
}
