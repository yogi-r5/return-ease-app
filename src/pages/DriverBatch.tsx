import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, ExternalLink, Truck } from "lucide-react";
import { format } from "date-fns";

export default function DriverBatch() {
  const { token } = useParams<{ token: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchBatchData();
  }, [token]);

  const fetchBatchData = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("driver-batch", {
        body: { token },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setBatch(data.batch);
      setReturns(data.returns || []);
    } catch (err: any) {
      setError(err.message || "Invalid or expired link");
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center px-6">
        <div className="glass-card rounded-3xl p-8 text-center max-w-sm">
          <Package className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Error</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pickup Batch</h1>
            <p className="text-muted-foreground text-sm">{batch?.building_address}</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-4">
          {returns.length} return label{returns.length !== 1 ? "s" : ""} to pick up
        </p>

        <div className="space-y-3 animate-fade-in-up">
          {returns.map((r, idx) => (
            <div key={r.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium text-sm">
                    Label #{idx + 1}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Deadline: {format(new Date(r.deadline), "MMM d, yyyy")}
                  </p>
                </div>
                {r.label_url && (
                  <a
                    href={r.label_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="auth-btn-primary !w-auto !py-2 !px-4 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Label</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
