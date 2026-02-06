export default function CTASection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-12">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 p-8 text-white shadow-[0_30px_80px_rgba(128,0,255,0.25)]">
          <h3 className="text-2xl font-semibold">Build once, deploy everywhere.</h3>
          <p className="mt-3 text-sm leading-6 text-white/90">
            Launch agents across support, revenue, security, and ops with one
            unified platform.
          </p>
          <button className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
            Get started
          </button>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 p-8 text-white shadow-[0_30px_80px_rgba(255,77,196,0.25)]">
          <h3 className="text-2xl font-semibold">Scale in real time.</h3>
          <p className="mt-3 text-sm leading-6 text-white/90">
            Monitor agents, reroute failures, and keep workflows healthy with
            enterprise-grade reliability.
          </p>
          <button className="mt-6 rounded-full bg-black/20 px-5 py-2 text-sm font-semibold text-white">
            Schedule demo
          </button>
        </div>
      </div>
    </section>
  );
}
