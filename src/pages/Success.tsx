import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle, Loader2 } from "lucide-react";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const returnIdsParam = searchParams.get("return_ids");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  const isGuest = !returnIdsParam; // Rough heuristic

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setStatus("error");
      setErrorMsg("No payment session found.");
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data?.verified) {
        setStatus("success");
        // Fire notification for each confirmed return
        if (data.returnIds?.length) {
          for (const rid of data.returnIds) {
            supabase.functions.invoke("send-notification", {
              body: { type: "payment_confirmed", returnId: rid },
            }).catch(console.error);
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
        {status === "verifying" && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-secondary/50 mb-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">Verifying Payment...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-teal-vibrant to-emerald-rich mb-8 animate-check-bounce shadow-glow-lg">
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3 animate-fade-in">
              Return Confirmed!
            </h1>
            <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Your package is now in the basket. We'll notify you when it's picked up.
            </p>

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

        {status === "error" && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/20 mb-8">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">Payment Issue</h1>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="auth-btn-primary w-full"
            >
              <span>Go to Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Decorative */}
      <div className="fixed top-20 left-10 w-40 h-40 bg-teal-vibrant/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-10 w-56 h-56 bg-emerald-deep/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
    </div>
  );
}
