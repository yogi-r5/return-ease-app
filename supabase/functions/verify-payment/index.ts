/**
 * verify-payment
 *
 * Supports two payment verification paths:
 *  1. Stripe Checkout Session  → pass { session_id }
 *  2. Stripe PaymentIntent     → pass { payment_intent_id, return_ids }
 *     (used by the Express Checkout / Apple Pay / Google Pay flow)
 *
 * On successful verification the corresponding returns are marked as paid.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service-role key so we can update any row regardless of RLS
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { session_id, payment_intent_id, return_ids } = body;

    if (!session_id && !payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "Provide session_id or payment_intent_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let returnIds: string[] = [];
    let paymentIntentId: string | null = null;

    // ── Path A: Stripe Checkout Session ──────────────────────────────────────
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status !== "paid") {
        return new Response(
          JSON.stringify({ verified: false, status: session.payment_status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const idsStr = session.metadata?.return_ids ?? "";
      returnIds = idsStr.split(",").filter(Boolean);
      paymentIntentId = session.payment_intent as string;
    }

    // ── Path B: PaymentIntent (Express Checkout) ──────────────────────────────
    if (payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);

      if (pi.status !== "succeeded") {
        return new Response(
          JSON.stringify({ verified: false, status: pi.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prefer IDs stored in PaymentIntent metadata; fall back to what the
      // client sent (return_ids query param on the success page URL).
      const metaIds = pi.metadata?.return_ids ?? "";
      returnIds = metaIds
        ? metaIds.split(",").filter(Boolean)
        : (typeof return_ids === "string" ? return_ids : "").split(",").filter(Boolean);
      paymentIntentId = payment_intent_id;
    }

    // ── Mark returns as paid ──────────────────────────────────────────────────
    if (returnIds.length > 0) {
      const { error: updateErr } = await supabase
        .from("returns")
        .update({
          paid: true,
          stripe_payment_intent_id: paymentIntentId,
        })
        .in("id", returnIds);

      if (updateErr) throw updateErr;
    }

    return new Response(JSON.stringify({ verified: true, returnIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("verify-payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
