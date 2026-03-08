import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Truck, DollarSign, Copy, Check, Search, RefreshCw } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaid, setFilterPaid] = useState<string>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
      // Send notification
      supabase.functions.invoke("send-notification", {
        body: { type: "status_update", returnId },
      }).catch(console.error);
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

  const copyDriverLink = (accessToken: string) => {
    const url = `${window.location.origin}/driver/${accessToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(accessToken);
    toast({ title: "Copied!", description: "Driver link copied to clipboard" });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Stats
  const totalRevenue = returns.filter((r) => r.paid).reduce((sum, r) => sum + Number(r.service_fee || 5), 0);
  const paidCount = returns.filter((r) => r.paid).length;
  const unpaidCount = returns.filter((r) => !r.paid).length;
  const activeCount = returns.filter((r) => r.paid && r.status !== "dropped_off").length;

  // Filtered returns
  const filteredReturns = returns.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterPaid === "paid" && !r.paid) return false;
    if (filterPaid === "unpaid" && r.paid) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesEmail = r.guest_email?.toLowerCase().includes(q);
      const matchesAddress = r.building_address?.toLowerCase().includes(q);
      const matchesId = r.id.toLowerCase().includes(q);
      if (!matchesEmail && !matchesAddress && !matchesId) return false;
    }
    return true;
  });

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-in-up">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{returns.length}</p>
            <p className="text-muted-foreground text-xs">Total Orders</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-primary">${totalRevenue.toFixed(0)}</p>
            <p className="text-muted-foreground text-xs">Revenue</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
            <p className="text-muted-foreground text-xs">Active</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{batches.length}</p>
            <p className="text-muted-foreground text-xs">Batches</p>
          </div>
        </div>

        {/* Delivery Batches */}
        {batches.length > 0 && (
          <div className="mb-8 animate-fade-in-up">
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Delivery Batches ({batches.length})
            </h2>
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-foreground font-medium text-sm">{batch.building_address}</p>
                      <p className="text-muted-foreground text-xs">
                        Status: {batch.status?.replace(/_/g, " ")} · {format(new Date(batch.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <button
                      onClick={() => copyDriverLink(batch.access_token)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"
                    >
                      {copiedToken === batch.access_token ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedToken === batch.access_token ? "Copied" : "Copy Driver Link"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 animate-fade-in-up">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, address, ID..."
                className="w-full bg-secondary/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-10 text-xs bg-secondary/30 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPaid} onValueChange={setFilterPaid}>
            <SelectTrigger className="w-[120px] h-10 text-xs bg-secondary/30 border-border">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* All Orders */}
        <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Orders ({filteredReturns.length})
        </h2>

        <div className="space-y-3 animate-fade-in-up">
          {filteredReturns.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-muted-foreground text-sm">No orders match your filters.</p>
            </div>
          ) : (
            filteredReturns.map((r) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
