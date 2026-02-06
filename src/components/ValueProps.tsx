const items = [
  {
    title: "Months of Development",
    description:
      "Ship faster by skipping the heavy lifting. Get to production without the boilerplate, infrastructure, or ops burden.",
  },
  {
    title: "60-Second Deploy",
    description:
      "Launch instantly with prebuilt agents and workflows. Configure once and go live in under a minute.",
  },
  {
    title: "Battle-Tested",
    description:
      "Agents are hardened in production with monitoring, retries, and security best practices baked in.",
  },
];

export default function ValueProps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-12">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold text-white md:text-4xl">
          Why waste months building what already exists?
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-[0_0_20px_rgba(0,0,0,0.4)]"
          >
            <h3 className="mb-3 text-lg font-semibold text-white">
              {item.title}
            </h3>
            <p className="text-sm leading-6 text-zinc-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
