const stats = [
  { label: "60s", detail: "Average deploy" },
  { label: "99.9%", detail: "Uptime" },
  { label: "24/7", detail: "Coverage" },
  { label: "$0", detail: "Setup cost" },
];

export default function StatsBar() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-12 md:px-12">
      <div className="grid gap-6 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0b0b0b] via-[#111111] to-[#0b0b0b] p-6 text-center md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-semibold text-white">{stat.label}</p>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
