"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

const categories = [
  {
    name: "Marketing",
    sections: [
      {
        title: "DIGITAL MARKETING & PR",
        items: ["Social Media Management", "Content Creation", "Email Marketing"],
      },
      {
        title: "SEARCH & SEO",
        items: ["SEO Optimization", "Keyword Research", "Link Building"],
      },
    ],
  },
  {
    name: "Development",
    sections: [
      {
        title: "WEB DEVELOPMENT",
        items: ["Frontend Development", "Backend Development", "Full Stack Development"],
      },
      {
        title: "MOBILE & APPS",
        items: ["iOS Development", "Android Development", "React Native"],
      },
    ],
  },
  {
    name: "Design & Creative",
    sections: [
      {
        title: "GRAPHIC DESIGN",
        items: ["Logo Design", "Brand Identity", "Print Design"],
      },
      {
        title: "WEB & UI DESIGN",
        items: ["Website Design", "UI/UX Design", "Mobile App Design"],
      },
    ],
  },
  {
    name: "Content & Writing",
    sections: [
      {
        title: "CONTENT CREATION",
        items: ["Blog Writing", "Copywriting", "Technical Writing"],
      },
      {
        title: "EDITING & PROOFREADING",
        items: ["Content Editing", "Proofreading", "Grammar Checking"],
      },
    ],
  },
  {
    name: "Business & Finance",
    sections: [
      {
        title: "BUSINESS OPERATIONS",
        items: ["Project Management", "Virtual Assistant", "Customer Service"],
      },
      {
        title: "FINANCIAL SERVICES",
        items: ["Accounting Automation", "Invoice Processing", "Expense Management"],
      },
    ],
  },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between px-6 py-6 md:px-12">
      {/* Logo */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          AgentFoundry
        </Link>

        {/* Browse Agents Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className="flex items-center gap-1 text-sm text-zinc-300 transition hover:text-white"
          >
            Browse Agents
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Mega Menu Dropdown */}
          {isOpen && (
            <div className="absolute left-0 top-full z-50 mt-4 w-[800px] rounded-xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
              <div className="grid grid-cols-5 gap-6">
                {categories.map((category) => (
                  <div key={category.name}>
                    <h3 className="mb-4 text-sm font-semibold text-white">{category.name}</h3>
                    {category.sections.map((section) => (
                      <div key={section.title} className="mb-4">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          {section.title}
                        </p>
                        <ul className="space-y-1.5">
                          {section.items.map((item) => (
                            <li key={item}>
                              <Link
                                href={`/search?q=${encodeURIComponent(item)}`}
                                className="text-sm text-zinc-400 transition hover:text-white"
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
              <div className="mt-6 flex items-center gap-8 border-t border-white/10 pt-6 text-xs text-zinc-500">
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
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-300 transition hover:text-white"
        >
          Dashboard
        </Link>
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
          type="button"
        >
          Sign in with GitHub
        </button>
      </div>
    </header>
  );
}
