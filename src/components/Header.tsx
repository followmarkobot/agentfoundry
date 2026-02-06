"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-12">
      <Link href="/" className="text-lg font-semibold text-white">
        AgentFoundry
      </Link>
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
