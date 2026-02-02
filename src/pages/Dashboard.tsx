import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, LogOut, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
  };

  if (isLoading) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-vibrant/30 border-t-teal-vibrant rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Returns</h1>
            <p className="text-white/50 text-sm mt-1">
              {user?.email || user?.phone}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-3 text-white/50 hover:text-white/80 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Empty State */}
        <div
          className="glass-card rounded-3xl p-8 text-center animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-4">
            <Package className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">
            No active returns
          </h2>
          <p className="text-white/50 text-sm mb-6">
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

        {/* Quick Actions */}
        <div className="mt-6 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={() => navigate("/new-return")}
            className="glass-card w-full rounded-2xl p-4 flex items-center justify-between group hover:border-teal-vibrant/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-vibrant/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-teal-light" />
              </div>
              <span className="text-white font-medium">Start New Return</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
