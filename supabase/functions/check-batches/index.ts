import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Get all paid returns that aren't in a batch yet, grouped by building_address
    const { data: unbatchedReturns, error: fetchErr } = await supabase
      .from("returns")
      .select("id, building_address")
      .eq("paid", true)
      .not("building_address", "is", null);

    if (fetchErr) throw fetchErr;

    // Get returns already in batches
    const { data: batchedRows } = await supabase
      .from("batch_returns")
      .select("return_id");

    const batchedIds = new Set((batchedRows || []).map((r: any) => r.return_id));

    // Filter to unbatched returns
    const available = (unbatchedReturns || []).filter((r: any) => !batchedIds.has(r.id));

    // Group by building_address
    const groups: Record<string, string[]> = {};
    for (const r of available) {
      const addr = (r.building_address || "").trim().toLowerCase();
      if (!addr) continue;
      if (!groups[addr]) groups[addr] = [];
      groups[addr].push(r.id);
    }

    let batchesCreated = 0;

    for (const [address, returnIds] of Object.entries(groups)) {
      if (returnIds.length >= 5) {
        // Take first 5
        const batchReturnIds = returnIds.slice(0, 5);

        // Create delivery batch
        const { data: batch, error: batchErr } = await supabase
          .from("delivery_batches")
          .insert({
            building_address: address,
            status: "pending",
          })
          .select("id, access_token")
          .single();

        if (batchErr) throw batchErr;

        // Link returns to batch
        const batchReturnRows = batchReturnIds.map((rid: string) => ({
          batch_id: batch.id,
          return_id: rid,
        }));

        const { error: linkErr } = await supabase
          .from("batch_returns")
          .insert(batchReturnRows);

        if (linkErr) throw linkErr;

        // Mock delivery API call (DoorDash/Uber placeholder)
        const mockApiResponse = {
          provider: "mock_delivery_api",
          delivery_id: `DEL-${Date.now()}`,
          status: "scheduled",
          pickup_address: address,
          item_count: batchReturnIds.length,
          estimated_pickup: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };

        await supabase
          .from("delivery_batches")
          .update({
            status: "delivery_booked",
            delivery_api_response: mockApiResponse,
          })
          .eq("id", batch.id);

        // Update return statuses to courier_assigned
        await supabase
          .from("returns")
          .update({ status: "courier_assigned" })
          .in("id", batchReturnIds);

        batchesCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `${batchesCreated} batch(es) created. ${Object.keys(groups).length} location(s) checked.`,
        batchesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
