import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
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

const getBaseUrl = (req: Request) => {
  const configured = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL");
  if (configured) return configured.replace(/\/$/, "");

  logStep("Missing APP_URL/SITE_URL", { origin: req.headers.get("origin") });
  throw new HttpError(500, "APP_URL or SITE_URL must be configured");
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

    const supabaseClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_ANON_KEY"),
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new HttpError(401, `Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new HttpError(401, "User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripeKey = getRequiredEnv("STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) throw new HttpError(500, subscriptionError.message);

    let customerId = subscription?.stripe_customer_id ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      throw new HttpError(404, "No Stripe customer found for this user");
    }

    logStep("Found Stripe customer", { customerId });

    const baseUrl = getBaseUrl(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/billing`,
    });
    logStep("Portal session created");

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
