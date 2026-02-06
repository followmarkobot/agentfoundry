import CTASection from "@/components/CTASection";
import FeaturedAgents from "@/components/FeaturedAgents";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import ValueProps from "@/components/ValueProps";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-purple-500/20 blur-[140px]" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-pink-500/20 blur-[140px]" />
        </div>
        <Header />
        <Hero />
      </div>
      <ValueProps />
      <FeaturedAgents />
      <StatsBar />
      <CTASection />
    </div>
  );
}
