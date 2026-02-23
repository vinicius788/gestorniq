import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { getBaseUrl, getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("customer-portal", req);

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
      scope: "customer-portal",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 300, maxRequests: 6 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 24 },
      ],
    });

    const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), { apiVersion: "2025-08-27.basil" });

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

    const baseUrl = getBaseUrl(req, logger.info);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/billing?portal=return`,
    });

    await writeAuditLog(supabaseAdmin, {
      action: "billing.customer_portal_opened",
      actorUserId: user.id,
      actorIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      metadata: {
        stripe_customer_id: customerId,
      },
    });

    logger.done("customer_portal.created", { stripe_customer_id: customerId });

    return jsonResponse({ url: portalSession.url }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.fail("customer_portal.failed", { status, message });

    return jsonResponse({ error: message }, status, {}, req);
  }
});
