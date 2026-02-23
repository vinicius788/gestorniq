import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";

const normalizePlan = (plan: string | null | undefined) => {
  const normalized = (plan ?? "").toLowerCase().trim();
  if (!normalized || normalized === "free") return "standard";
  return "standard";
};

const normalizeStatus = (status: Stripe.Subscription.Status): string => {
  if (["active", "trialing", "past_due"].includes(status)) return status;
  if (["canceled", "unpaid", "incomplete", "incomplete_expired"].includes(status)) {
    return "cancelled";
  }
  return status;
};

interface SubscriptionUpdate {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  plan: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
}

async function updateSubscription(supabase: any, data: SubscriptionUpdate) {
  const payload = {
    stripe_customer_id: data.stripeCustomerId,
    stripe_subscription_id: data.stripeSubscriptionId,
    status: data.status,
    plan: data.plan,
    current_period_start: data.currentPeriodStart || null,
    current_period_end: data.currentPeriodEnd || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", data.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing?.id) {
    const { error } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .insert({ user_id: data.userId, ...payload });

  if (error) throw error;
}

serve(async (req) => {
  const logger = createRequestLogger("stripe-webhook", req);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new HttpError(400, "No Stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      throw new HttpError(500, "STRIPE_WEBHOOK_SECRET not configured");
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch {
      logger.fail("webhook.signature_invalid", { status: 400 });
      return jsonResponse({ error: "Invalid signature" }, 400, {}, req);
    }

    const { data: insertedEvents, error: eventStoreError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          payload: event,
          received_at: new Date().toISOString(),
        },
        { onConflict: "event_id", ignoreDuplicates: true },
      )
      .select("event_id");

    if (eventStoreError) {
      logger.error("webhook.event_store_failed", { message: eventStoreError.message, event_id: event.id });
      throw new HttpError(500, `Failed to persist webhook event: ${eventStoreError.message}`);
    }

    if (!insertedEvents || insertedEvents.length === 0) {
      logger.done("webhook.duplicate_ignored", { event_id: event.id, event_type: event.type });
      return jsonResponse({ received: true, duplicate: true }, 200, {}, req);
    }

    logger.info("webhook.received", { event_id: event.id, event_type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userIdFromMetadata = session.metadata?.user_id;
        const planFromMetadata = normalizePlan(session.metadata?.plan);

        let userId = userIdFromMetadata ?? null;
        if (!userId) {
          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("user_id")
              .eq("email", customerEmail)
              .maybeSingle();

            userId = profile?.user_id ?? null;
          }
        }

        if (userId && typeof session.customer === "string" && typeof session.subscription === "string") {
          let currentPeriodStart: string | null = null;
          let currentPeriodEnd: string | null = null;
          let status = "active";

          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            status = normalizeStatus(subscription.status);
          } catch {
            // Keep fallback values when Stripe retrieval transiently fails.
          }

          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status,
            plan: planFromMetadata,
            currentPeriodStart,
            currentPeriodEnd,
          });

          await writeAuditLog(supabaseAdmin, {
            action: "billing.webhook_checkout_completed",
            actorUserId: userId,
            metadata: {
              event_id: event.id,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            },
            source: "stripe_webhook",
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = normalizePlan(subscription.metadata?.plan);
        const status = normalizeStatus(subscription.status);

        let userId = subscription.metadata?.user_id ?? null;

        if (!userId && typeof subscription.customer === "string") {
          const { data: existingSub } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          userId = existingSub?.user_id ?? null;
        }

        if (userId && typeof subscription.customer === "string") {
          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status,
            plan,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          await writeAuditLog(supabaseAdmin, {
            action: "billing.webhook_subscription_updated",
            actorUserId: userId,
            metadata: {
              event_id: event.id,
              stripe_customer_id: subscription.customer,
              stripe_subscription_id: subscription.id,
              status,
              plan,
            },
            source: "stripe_webhook",
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: targetSubscription } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", subscription.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (targetSubscription?.id) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetSubscription.id);

          if (error) throw error;

          await writeAuditLog(supabaseAdmin, {
            action: "billing.webhook_subscription_deleted",
            actorUserId: targetSubscription.user_id,
            metadata: {
              event_id: event.id,
              stripe_subscription_id: subscription.id,
            },
            source: "stripe_webhook",
          });
        }

        break;
      }

      default:
        logger.info("webhook.unhandled", { event_type: event.type, event_id: event.id });
    }

    logger.done("webhook.processed", { event_type: event.type, event_id: event.id });

    return jsonResponse({ received: true }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("webhook.failed", { status, message });

    return jsonResponse({ error: message }, status, {}, req);
  }
});
