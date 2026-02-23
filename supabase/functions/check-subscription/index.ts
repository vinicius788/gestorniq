import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const normalizePlan = (
  plan: string | null | undefined,
  fallback: "free" | "standard" = "standard",
) => {
  const normalized = (plan ?? "").toLowerCase().trim();
  if (!normalized) return fallback;
  if (normalized === "free") return "free";
  return "standard";
};

const RESPONSE_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("check-subscription", req);

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
    if (!user?.id) throw new HttpError(401, "User not authenticated");
    logger.setUserId(user.id);

    await enforceRateLimit({
      req,
      supabaseAdmin,
      scope: "check-subscription",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 120, maxRequests: 6 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 40 },
      ],
    });

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
        logger.error("subscription.clear_failed", { message: clearError.message });
      }

      logger.done("subscription.none");

      return jsonResponse({
        subscribed: false,
        plan: null,
        status: "inactive",
        subscription_end: null,
      }, 200, RESPONSE_CACHE_HEADERS, req);
    }

    const [activeSubscriptions, trialingSubs, pastDueSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 1 }),
    ]);

    let resolvedSub: Stripe.Subscription | null = null;

    if (activeSubscriptions.data.length > 0) {
      resolvedSub = activeSubscriptions.data[0];
    } else if (trialingSubs.data.length > 0) {
      resolvedSub = trialingSubs.data[0];
    } else if (pastDueSubs.data.length > 0) {
      resolvedSub = pastDueSubs.data[0];
    }

    const { data: dbSubscription, error: dbSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbSubscriptionError) throw new HttpError(500, dbSubscriptionError.message);

    const hasBillableSubscription = Boolean(resolvedSub);
    const syncPayload = {
      user_id: user.id,
      status: resolvedSub?.status ?? "inactive",
      plan: normalizePlan(
        resolvedSub?.metadata?.plan ?? dbSubscription?.plan ?? null,
        hasBillableSubscription ? "standard" : "free",
      ),
      stripe_customer_id: customerId,
      stripe_subscription_id: resolvedSub?.id ?? null,
      current_period_start: resolvedSub
        ? new Date(resolvedSub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: resolvedSub
        ? new Date(resolvedSub.current_period_end * 1000).toISOString()
        : null,
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

    logger.done("subscription.synced", {
      subscribed: hasBillableSubscription,
      status: resolvedSub?.status ?? "inactive",
      plan: syncPayload.plan,
    });

    return jsonResponse({
      subscribed: hasBillableSubscription,
      plan: hasBillableSubscription ? syncPayload.plan : null,
      status: resolvedSub?.status ?? "inactive",
      subscription_end: syncPayload.current_period_end,
    }, 200, RESPONSE_CACHE_HEADERS, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.fail("subscription.sync_failed", { status, message: errorMessage });

    return jsonResponse({ error: errorMessage }, status, {}, req);
  }
});
