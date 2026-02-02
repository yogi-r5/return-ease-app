import { Package } from "lucide-react";

export default function LandingHero() {
  return (
    <div className="text-center mb-10 animate-fade-in">
      {/* Logo Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-vibrant to-emerald-rich mb-6 shadow-glow">
        <Package className="w-8 h-8 text-white" />
      </div>

      {/* Welcome Text */}
      <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
        Welcome to{" "}
        <span className="text-gradient">Returnee</span>
      </h1>
      <p className="text-lg text-white/60">
        at The House at Cornell Tech
      </p>
    </div>
  );
}
