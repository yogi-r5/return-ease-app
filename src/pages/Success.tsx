import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle, Loader2, Search } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Stripe Checkout flow sends ?session_id=...
  const sessionId = searchParams.get("session_id");

  // Express Checkout (Apple Pay / Google Pay) flow sends ?payment_intent_id=...&return_ids=...
  const paymentIntentId = searchParams.get("payment_intent_id");
  const returnIdsParam = searchParams.get("return_ids");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Detect whether the user has an active session so we can show the right CTA
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  useEffect(() => {
    if (sessionId || paymentIntentId) {
      verifyPayment();
    } else {
      setStatus("error");
      setErrorMsg("No payment session found.");
    }
  }, [sessionId, paymentIntentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyPayment = async () => {
    try {
      // Build the correct body depending on which flow we came from
      const body: Record<string, string> = {};
      if (sessionId) {
        body.session_id = sessionId;
      } else if (paymentIntentId) {
        body.payment_intent_id = paymentIntentId;
        if (returnIdsParam) body.return_ids = returnIdsParam;
      }

      const { data, error } = await supabase.functions.invoke("verify-payment", { body });

      if (error) throw error;

      if (data?.verified) {
        setStatus("success");

        // Fire notifications (best-effort — don't block on failure)
        if (data.returnIds?.length) {
          for (const rid of data.returnIds) {
            supabase.functions
              .invoke("send-notification", {
                body: { type: "payment_confirmed", returnId: rid },
              })
              .catch(console.error);
          }
        }
      } else {
        setStatus("error");
        setErrorMsg("Payment not confirmed. Please contact support.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to verify payment.");
    }
  };

  return (
    <div className="mesh-gradient min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">

        {/* ── Verifying ── */}
        {status === "verifying" && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-secondary/50 mb-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              Verifying Payment…
            </h1>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-teal-vibrant to-emerald-rich mb-8 animate-check-bounce shadow-glow-lg">
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3 animate-fade-in">
              Return Confirmed!
            </h1>
            <p
              className="text-muted-foreground mb-8 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Your package is now in the basket. We'll notify you when it's picked up.
            </p>

            {/* Authenticated users → dashboard */}
            {isAuthenticated === true && (
              <>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="auth-btn-primary w-full mb-3 animate-fade-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <span>Go to Dashboard</span>
                </button>
                <button
                  onClick={() => navigate("/new-return")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  Submit another return
                </button>
              </>
            )}

            {/* Guest users → track page + nudge to create account */}
            {isAuthenticated === false && (
              <>
                <button
                  onClick={() => navigate("/track")}
                  className="auth-btn-primary w-full mb-3 animate-fade-in-up flex items-center justify-center gap-2"
                  style={{ animationDelay: "0.2s" }}
                >
                  <Search className="w-4 h-4" />
                  <span>Track My Return</span>
                </button>

                <button
                  onClick={() => navigate("/new-return?guest=true")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  Submit another return as guest
                </button>

                <div
                  className="mt-6 glass-card rounded-2xl p-4 animate-fade-in"
                  style={{ animationDelay: "0.4s" }}
                >
                  <p className="text-muted-foreground/70 text-sm mb-3">
                    Create an account to track all your returns in one place — free.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
                  >
                    Sign up / Log in →
                  </button>
                </div>
              </>
            )}

            {/* While auth state is loading — show neutral button */}
            {isAuthenticated === null && (
              <button
                onClick={() => navigate("/")}
                className="auth-btn-primary w-full animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                <span>Go Home</span>
              </button>
            )}
          </>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/20 mb-8">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">Payment Issue</h1>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
              className="auth-btn-primary w-full"
            >
              <span>{isAuthenticated ? "Go to Dashboard" : "Go Home"}</span>
            </button>
          </div>
        )}

      </div>

      {/* Decorative blobs */}
      <div className="fixed top-20 left-10 w-40 h-40 bg-teal-vibrant/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-10 w-56 h-56 bg-emerald-deep/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
    </div>
  );
}
