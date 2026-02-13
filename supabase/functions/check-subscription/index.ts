import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const getRequiredEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new HttpError(500, `${key} is not configured`);
  return value;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const supabaseClient = createClient(
      supabaseUrl,
      getRequiredEnv("SUPABASE_ANON_KEY"),
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const supabaseAdmin = createClient(
      supabaseUrl,
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new HttpError(401, `Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new HttpError(401, "User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), { apiVersion: "2025-08-27.basil" });

    const { data: currentSubscription, error: currentSubError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSubError) throw new HttpError(500, currentSubError.message);

    let customerId = currentSubscription?.stripe_customer_id ?? null;

    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      logStep("No Stripe customer found");

      const { error: clearError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "inactive",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (clearError) {
        logStep("Failed to clear subscription state", { error: clearError.message });
      }

      return new Response(JSON.stringify({
        subscribed: false,
        plan: null,
        status: "inactive",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found Stripe customer", { customerId });

    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let hasActiveSub = activeSubscriptions.data.length > 0;
    let plan = null;
    let subscriptionEnd = null;
    let subscriptionStart = null;
    let stripeSubscriptionId = currentSubscription?.stripe_subscription_id ?? null;
    let status = "inactive";

    if (!hasActiveSub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      if (trialingSubs.data.length > 0) {
        hasActiveSub = true;
        const sub = trialingSubs.data[0];
        stripeSubscriptionId = sub.id;
        subscriptionStart = new Date(sub.current_period_start * 1000).toISOString();
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        plan = (sub.metadata?.plan || "pro").toLowerCase();
        status = "trialing";
      }
    } else {
      const sub = activeSubscriptions.data[0];
      stripeSubscriptionId = sub.id;
      subscriptionStart = new Date(sub.current_period_start * 1000).toISOString();
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      plan = (sub.metadata?.plan || "pro").toLowerCase();
      status = "active";
    }

    const { data: dbSubscription, error: dbSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbSubscriptionError) throw new HttpError(500, dbSubscriptionError.message);

    const syncPayload = {
      user_id: user.id,
      status,
      plan: plan ?? dbSubscription?.plan ?? "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: subscriptionStart,
      current_period_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    };

    if (dbSubscription?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update(syncPayload)
        .eq("id", dbSubscription.id);

      if (updateError) throw new HttpError(500, updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("subscriptions")
        .insert(syncPayload);

      if (insertError) throw new HttpError(500, insertError.message);
    }

    logStep("Subscription synced to DB", { userId: user.id, status, plan });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      status,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { status, message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
