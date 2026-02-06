export default function Hero() {
  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-10 md:px-12">
      <div className="flex flex-col gap-6">
        <span className="w-fit rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Deploy in 60 seconds
        </span>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
          Stop Building.{" "}
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Start Deploying.
          </span>
        </h1>
        <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
          Skip months of development. Deploy battle-tested AI agents with
          production-ready workflows, integrations, and observability built in.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Explore AI Automations
          </button>
          <p className="text-sm text-zinc-400">
            3000+ integrations ready | Production-ready workflows | 60-second
            setup
          </p>
        </div>
      </div>
    </section>
  );
}
