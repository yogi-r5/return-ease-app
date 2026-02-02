import { useSearchParams, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isGuest = searchParams.get("guest") === "true";

  return (
    <div className="mesh-gradient min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        {/* Success Check */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-teal-vibrant to-emerald-rich mb-8 animate-check-bounce shadow-glow-lg">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>

        <h1 className="text-3xl font-semibold text-white mb-3 animate-fade-in">
          Return Confirmed!
        </h1>
        <p className="text-white/60 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Your package is now in the basket. We'll notify you when it's picked up.
        </p>

        {/* Guest Conversion CTA */}
        {isGuest && (
          <div className="glass-card rounded-3xl p-6 mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-lg font-medium text-white mb-2">
              Track your return
            </h2>
            <p className="text-white/50 text-sm mb-4">
              Create an account to see real-time updates on your package
            </p>
            <button
              onClick={() => navigate("/")}
              className="auth-btn-primary w-full"
            >
              Create Account
            </button>
          </div>
        )}

        {/* Secondary Action */}
        <button
          onClick={() => navigate(isGuest ? "/" : "/dashboard")}
          className="text-white/50 hover:text-white/80 transition-colors animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          {isGuest ? "Return to home" : "Back to dashboard"}
        </button>
      </div>

      {/* Decorative */}
      <div className="fixed top-20 left-10 w-40 h-40 bg-teal-vibrant/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-10 w-56 h-56 bg-emerald-deep/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
    </div>
  );
}
