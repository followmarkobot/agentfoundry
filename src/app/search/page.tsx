"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "All";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-4">{query}</h1>
      <p className="text-zinc-400 text-lg mb-8">
        Coming soon — agents for {query}
      </p>
      <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
        ← Back to homepage
      </Link>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SearchContent />
    </Suspense>
  );
}
