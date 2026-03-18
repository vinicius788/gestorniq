import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { respondWithPublicError } from "../_shared/errors.ts";
import { getBaseUrl, getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { getPlanFromPriceId, resolveCheckoutPlan, resolveCheckoutPriceId } from "../_shared/stripe-plans.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("create-checkout", req);

  try {
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
      },
    );

    const supabaseAdmin = createClient(
      supabaseUrl,
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new HttpError(401, `Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id || !user.email) throw new HttpError(401, "User not authenticated");
    logger.setUserId(user.id);

    await enforceRateLimit({
      req,
      supabaseAdmin,
      scope: "create-checkout",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 300, maxRequests: 6 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 24 },
      ],
    });

    const body = await req.json().catch(() => ({}));
    const requestedPlan = typeof body.plan === "string" ? body.plan : null;
    const planName = typeof body.planName === "string" ? body.planName : null;
    const requestedPriceId = typeof body.priceId === "string" ? body.priceId.trim() : "";
    const companyId = typeof body.company_id === "string" ? body.company_id : "";

    if (!companyId) {
      throw new HttpError(400, "company_id is required");
    }

    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("clerk_user_id", user.id)
      .maybeSingle();

    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(403, "Unauthorized company access");

    const stripeSecret = getRequiredEnv("STRIPE_SECRET_KEY");
    const baseUrl = getBaseUrl(req, logger.info);
    const planSlug = resolveCheckoutPlan(requestedPlan, planName);

    let stripePriceId = requestedPriceId;
    if (stripePriceId) {
      const pricePlan = getPlanFromPriceId(stripePriceId, "free");
      if (pricePlan === "free" || pricePlan !== planSlug) {
        throw new HttpError(400, "priceId does not match requested plan");
      }
    } else {
      stripePriceId = resolveCheckoutPriceId(planSlug);
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logger.info("checkout.customer.reused", { customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          company_id: companyId,
          plan: planSlug,
          billing_cycle: "annual",
          clerk_user_id: user.id,
        },
      },
      metadata: {
        company_id: companyId,
        plan: planSlug,
        billing_cycle: "annual",
        clerk_user_id: user.id,
      },
      success_url: `${baseUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${baseUrl}/dashboard/billing?checkout=canceled`,
    });

    await writeAuditLog(supabaseAdmin, {
      action: "billing.checkout_session_created",
      companyId,
      actorIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      actorUserId: user.id,
      metadata: {
        session_id: session.id,
        plan: planSlug,
        billing_cycle: "annual",
      },
    });

    logger.done("checkout.created", { company_id: companyId, session_id: session.id });

    return jsonResponse({ url: session.url }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    logger.fail("checkout.failed", {
      status,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return respondWithPublicError(error, req);
  }
});
