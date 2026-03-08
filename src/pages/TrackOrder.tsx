import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReturnStatusCard from "@/components/returns/ReturnStatusCard";

export default function TrackOrder() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [returns, setReturns] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async () => {
    if (!email.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("guest-lookup", {
        body: { email: email.trim() },
      });

      if (error) throw error;
      setReturns(data?.returns || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button
            onClick={() => navigate("/")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Track Your Return</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter the email used for your return
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-6 animate-fade-in-up">
          <label className="text-muted-foreground text-sm mb-2 block">Email address</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="you@email.com"
              className="flex-1 bg-secondary/30 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleLookup}
              disabled={isLoading}
              className="auth-btn-primary !w-auto !py-3 !px-5 shrink-0"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {returns !== null && (
          <div className="animate-fade-in-up">
            {returns.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-medium text-foreground mb-2">No returns found</h2>
                <p className="text-muted-foreground text-sm">
                  No returns are associated with this email.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm mb-2">
                  {returns.length} return{returns.length !== 1 ? "s" : ""} found
                </p>
                {returns.map((r) => (
                  <ReturnStatusCard key={r.id} returnItem={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
