import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, ExternalLink, Truck, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function DriverBatch() {
  const { token } = useParams<{ token: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  useEffect(() => {
    if (token) fetchBatchData();
  }, [token]);

  const fetchBatchData = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("driver-batch", {
        body: { token, action: "view" },
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

  const handleConfirmPickup = async () => {
    if (!token) return;
    setConfirmingAll(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("driver-batch", {
        body: { token, action: "confirm_pickup" },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Pickup confirmed!", description: "All items marked as en route." });
      fetchBatchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConfirmingAll(false);
  };

  const handleConfirmDropoff = async () => {
    if (!token) return;
    setConfirmingAll(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("driver-batch", {
        body: { token, action: "confirm_dropoff" },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Drop-off confirmed!", description: "All items marked as dropped off." });
      fetchBatchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConfirmingAll(false);
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

  const allEnRoute = returns.every((r) => r.status === "en_route");
  const allDroppedOff = returns.every((r) => r.status === "dropped_off");
  const showPickupBtn = returns.some((r) => r.status === "courier_assigned");
  const showDropoffBtn = allEnRoute && !allDroppedOff;

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

        {/* Batch status */}
        <div className="glass-card rounded-2xl p-4 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Batch Status</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              allDroppedOff ? "bg-primary/20 text-primary" :
              allEnRoute ? "bg-accent/20 text-accent" :
              "bg-secondary/50 text-foreground"
            }`}>
              {allDroppedOff ? "Completed" : allEnRoute ? "En Route" : batch?.status?.replace(/_/g, " ")}
            </span>
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
                  <p className="text-foreground font-medium text-sm flex items-center gap-2">
                    Label #{idx + 1}
                    {r.status === "dropped_off" && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Deadline: {format(new Date(r.deadline), "MMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground/60 text-xs capitalize">
                    Status: {r.status?.replace(/_/g, " ")}
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
                    <span>Label</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {!allDroppedOff && (
          <div className="mt-6 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {showPickupBtn && (
              <button
                onClick={handleConfirmPickup}
                disabled={confirmingAll}
                className="auth-btn-primary w-full disabled:opacity-50"
              >
                {confirmingAll ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Truck className="w-5 h-5" />
                    <span>Confirm Pickup — All Items Collected</span>
                  </>
                )}
              </button>
            )}

            {showDropoffBtn && (
              <button
                onClick={handleConfirmDropoff}
                disabled={confirmingAll}
                className="auth-btn-primary w-full disabled:opacity-50"
              >
                {confirmingAll ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Drop-off — All Items Delivered</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {allDroppedOff && (
          <div className="glass-card rounded-3xl p-6 mt-6 text-center animate-fade-in-up">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-medium text-foreground mb-1">Batch Complete</h2>
            <p className="text-muted-foreground text-sm">All items have been dropped off. Thank you!</p>
          </div>
        )}
      </div>
    </div>
  );
}
