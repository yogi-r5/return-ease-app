/**
 * create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the Express Checkout flow
 * (Apple Pay / Google Pay). The amount is always $5.00 flat —
 * regardless of how many returns (1–5) are in the order.
 *
 * Called by the browser immediately after the user authorises
 * payment in the native wallet sheet.
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { returnIds, guestEmail } = await req.json();

    if (!returnIds || returnIds.length === 0) {
      return new Response(JSON.stringify({ error: "returnIds is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerEmail: string | undefined = guestEmail;
    let userId: string | null = null;

    // Try to identify authenticated user from the Bearer token
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        customerEmail = data.user.email;
        userId = data.user.id;
      }
    }

    // Re-use existing Stripe customer when possible
    let customerId: string | undefined;
    if (customerEmail) {
      const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 500, // $5.00 USD — flat fee for up to 5 returns
      currency: "usd",
      customer: customerId,
      receipt_email: customerEmail,
      metadata: {
        return_ids: (returnIds as string[]).join(","),
        user_id: userId ?? "",
      },
      // Allow card (covers Apple Pay & Google Pay tokenised cards) and Link
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("create-payment-intent error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
