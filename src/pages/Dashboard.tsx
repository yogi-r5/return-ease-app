import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, LogOut, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReturnStatusCard from "@/components/returns/ReturnStatusCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/");
        } else {
          setUser(session.user);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        fetchReturns();
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchReturns = async () => {
    const { data, error } = await supabase
      .from("returns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReturns(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "See you next time!" });
  };

  if (isLoading) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Returns</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user?.email || user?.phone}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Returns List or Empty State */}
        {returns.length > 0 ? (
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {returns.map((r) => (
              <ReturnStatusCard key={r.id} returnItem={r} />
            ))}
          </div>
        ) : (
          <div
            className="glass-card rounded-3xl p-8 text-center animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/50 mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              No active returns
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Start a return and we'll handle the rest
            </p>
            <button
              onClick={() => navigate("/new-return")}
              className="auth-btn-primary inline-flex"
            >
              <Plus className="w-5 h-5" />
              <span>New Return</span>
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={() => navigate("/new-return")}
            className="glass-card w-full rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium">Start New Return</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
