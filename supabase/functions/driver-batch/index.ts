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
    const { token, action } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Find batch by access token
    const { data: batch, error: batchErr } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("access_token", token)
      .single();

    if (batchErr || !batch) {
      return new Response(JSON.stringify({ error: "Batch not found or link expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get linked returns
    const { data: batchReturns } = await supabase
      .from("batch_returns")
      .select("return_id")
      .eq("batch_id", batch.id);

    const returnIds = (batchReturns || []).map((br: any) => br.return_id);

    // Handle actions
    if (action === "confirm_pickup" && returnIds.length > 0) {
      await supabase
        .from("returns")
        .update({ status: "en_route" })
        .in("id", returnIds);

      await supabase
        .from("delivery_batches")
        .update({ status: "en_route" })
        .eq("id", batch.id);

      // Send notifications for each return
      for (const rid of returnIds) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ type: "status_update", returnId: rid }),
          });
        } catch (_) { /* notification failure shouldn't block */ }
      }
    }

    if (action === "confirm_dropoff" && returnIds.length > 0) {
      await supabase
        .from("returns")
        .update({ status: "dropped_off" })
        .in("id", returnIds);

      await supabase
        .from("delivery_batches")
        .update({ status: "completed" })
        .eq("id", batch.id);

      for (const rid of returnIds) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ type: "status_update", returnId: rid }),
          });
        } catch (_) { /* notification failure shouldn't block */ }
      }
    }

    // Re-fetch batch and returns after action
    const { data: updatedBatch } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("id", batch.id)
      .single();

    let returns: any[] = [];
    if (returnIds.length > 0) {
      const { data } = await supabase
        .from("returns")
        .select("id, deadline, label_url, status, building_address")
        .in("id", returnIds);
      returns = data || [];
    }

    return new Response(JSON.stringify({ batch: updatedBatch || batch, returns }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
