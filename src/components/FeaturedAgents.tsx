const agents = [
  {
    name: "Customer Support Copilot",
    description:
      "Resolve tickets with multi-step reasoning, sentiment detection, and auto-triage.",
    tag: "Support",
  },
  {
    name: "Growth Ops Automator",
    description:
      "Launch campaigns, score leads, and sync pipelines to your CRM in seconds.",
    tag: "Marketing",
  },
  {
    name: "Finance Close Agent",
    description:
      "Reconcile transactions, flag anomalies, and generate reports on demand.",
    tag: "Finance",
  },
  {
    name: "Security Watchtower",
    description:
      "Monitor logs, detect threats, and trigger response playbooks instantly.",
    tag: "Security",
  },
  {
    name: "Product Insight Miner",
    description:
      "Transform user feedback into prioritized action items and roadmap briefs.",
    tag: "Product",
  },
  {
    name: "Engineering Relay",
    description:
      "Ship reliable workflows with CI/CD, deployment checks, and rollback logic.",
    tag: "Engineering",
  },
];

export default function FeaturedAgents() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-purple-300">
            Featured agents
          </p>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">
            Launch production-ready AI automations
          </h2>
        </div>
        <span className="hidden text-sm text-zinc-400 md:inline">
          Built for teams that ship fast
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition hover:-translate-y-1 hover:border-white/20"
          >
            <span className="w-fit rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
              {agent.tag}
            </span>
            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
            <p className="text-sm leading-6 text-zinc-400">
              {agent.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
