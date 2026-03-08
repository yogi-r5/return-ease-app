import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Placeholder email sender — swap with SendGrid/Resend/etc when ready
async function sendEmail(to: string, subject: string, body: string) {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Body: ${body}`);
  // TODO: Integrate with a real email provider (SendGrid, Resend, etc.)
  return { success: true, provider: "mock" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { type, returnId, batchId } = await req.json();

    if (type === "payment_confirmed" && returnId) {
      // Get return details
      const { data: ret } = await supabase
        .from("returns")
        .select("*")
        .eq("id", returnId)
        .single();

      if (ret) {
        const email = ret.guest_email || "";
        if (email) {
          await sendEmail(
            email,
            "Returnee — Payment Confirmed",
            `Your return has been confirmed and is in the basket. We'll notify you when a courier is assigned. Deadline: ${ret.deadline}`
          );
        }
      }
    }

    if (type === "status_update" && returnId) {
      const { data: ret } = await supabase
        .from("returns")
        .select("*")
        .eq("id", returnId)
        .single();

      if (ret) {
        const email = ret.guest_email || "";
        const statusLabels: Record<string, string> = {
          in_basket: "In Basket",
          courier_assigned: "Courier Assigned",
          en_route: "En Route to Drop-off",
          dropped_off: "Dropped Off — Complete!",
        };
        if (email) {
          await sendEmail(
            email,
            `Returnee — Status Update: ${statusLabels[ret.status] || ret.status}`,
            `Your return status has been updated to: ${statusLabels[ret.status] || ret.status}.`
          );
        }
      }
    }

    if (type === "batch_created" && batchId) {
      const { data: batch } = await supabase
        .from("delivery_batches")
        .select("*")
        .eq("id", batchId)
        .single();

      if (batch) {
        // Notify admins
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        console.log(`[BATCH NOTIFICATION] Batch ${batchId} created at ${batch.building_address}. ${(admins || []).length} admin(s) to notify.`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
