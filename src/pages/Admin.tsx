import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, RefreshCw, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["in_basket", "courier_assigned", "en_route", "dropped_off"] as const;

const STATUS_LABELS: Record<string, string> = {
  in_basket: "In Basket",
  courier_assigned: "Courier Assigned",
  en_route: "En Route",
  dropped_off: "Dropped Off",
};

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [returns, setReturns] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [checkingBatch, setCheckingBatch] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({ title: "Access denied", description: "You are not an admin.", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    fetchData();
    setIsLoading(false);
  };

  const fetchData = async () => {
    const [returnsRes, batchesRes] = await Promise.all([
      supabase.from("returns").select("*").order("created_at", { ascending: false }),
      supabase.from("delivery_batches").select("*").order("created_at", { ascending: false }),
    ]);

    if (returnsRes.data) setReturns(returnsRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
  };

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    const { error } = await supabase
      .from("returns")
      .update({ status: newStatus as any })
      .eq("id", returnId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Status changed to ${STATUS_LABELS[newStatus]}` });
      fetchData();
    }
  };

  const triggerBatchCheck = async () => {
    setCheckingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-batches");
      if (error) throw error;
      toast({
        title: "Batch check complete",
        description: data?.message || "Done",
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCheckingBatch(false);
  };

  if (isLoading) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          </div>
          <button
            onClick={triggerBatchCheck}
            disabled={checkingBatch}
            className="auth-btn-primary !w-auto !py-2 !px-4 text-sm"
          >
            {checkingBatch ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Check Batches</span>
              </>
            )}
          </button>
        </div>

        {/* Delivery Batches */}
        {batches.length > 0 && (
          <div className="mb-8 animate-fade-in-up">
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Delivery Batches
            </h2>
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-medium text-sm">{batch.building_address}</p>
                      <p className="text-muted-foreground text-xs">
                        Status: {batch.status} · Created {format(new Date(batch.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Driver link:</p>
                      <code className="text-xs text-primary break-all">
                        /driver/{batch.access_token}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Orders */}
        <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> All Orders ({returns.length})
        </h2>

        <div className="space-y-3 animate-fade-in-up">
          {returns.map((r) => (
            <div key={r.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.paid ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                      {r.paid ? "Paid" : "Unpaid"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <p className="text-foreground text-sm font-medium truncate">
                    {r.user_id ? `User: ${r.user_id.slice(0, 8)}...` : `Guest: ${r.guest_email}`}
                  </p>
                  {r.building_address && (
                    <p className="text-muted-foreground text-xs mt-0.5">📍 {r.building_address}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Deadline: {format(new Date(r.deadline), "MMM d, yyyy")} · Fee: ${r.service_fee}
                  </p>
                  {r.label_url && (
                    <a href={r.label_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">
                      View Label
                    </a>
                  )}
                </div>
                <div className="w-44 shrink-0">
                  <Select
                    value={r.status}
                    onValueChange={(val) => handleStatusChange(r.id, val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-secondary/30 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
