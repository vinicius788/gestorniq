import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    const body = await req.json().catch(() => ({}));
    const plan = typeof body.plan === "string" ? body.plan.toLowerCase() : "pro";
    const companyId = typeof body.company_id === "string" ? body.company_id : "";

    if (!companyId) {
      throw new HttpError(400, "company_id is required");
    }

    if (!["starter", "pro"].includes(plan)) {
      throw new HttpError(400, "plan must be starter or pro");
    }

    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(403, "Unauthorized company access");

    const stripeSecret = getRequiredEnv("STRIPE_SECRET_KEY");
    const STRIPE_PRICE_STARTER = getRequiredEnv("STRIPE_PRICE_STARTER");
    const STRIPE_PRICE_PRO = getRequiredEnv("STRIPE_PRICE_PRO");
    const baseUrl = getBaseUrl(req);

    const priceId = plan === "starter" ? STRIPE_PRICE_STARTER : STRIPE_PRICE_PRO;
    const planName = plan === "starter" ? "Starter" : "Pro";
    logStep("Validated request", { userId: user.id, companyId, plan });

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing Stripe customer, will create new");
    }

    // Create checkout session with actual price ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          company_id: companyId,
          plan: planName,
          user_id: user.id,
        },
      },
      metadata: {
        company_id: companyId,
        plan: planName,
        user_id: user.id,
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/billing?checkout=canceled`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { status, message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
