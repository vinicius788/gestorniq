import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { publicError, respondWithPublicError } from "../_shared/errors.ts";
import { HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { getPlanFromSubscription, getSubscriptionAmountCents, normalizePlan } from "../_shared/stripe-plans.ts";

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
  amountCents: number;
  currency: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
}

const getMonthDate = (timestampSeconds: number): string => {
  const date = new Date(timestampSeconds * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const getCurrentMonthDate = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

async function getCompanyIdByClerkUserId(
  supabase: any,
  clerkUserId: string,
): Promise<string | null> {
  const { data: company, error } = await supabase
    .from("companies")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return company?.id ?? null;
}

async function incrementSnapshotMetric(
  supabase: any,
  companyId: string,
  monthDate: string,
  metric: "new_mrr" | "churned_mrr",
  delta: number,
) {
  if (delta <= 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("revenue_snapshots")
    .select("mrr, arr, new_mrr, expansion_mrr, churned_mrr")
    .eq("company_id", companyId)
    .eq("date", monthDate)
    .maybeSingle();

  if (existingError) throw existingError;

  const nextValue = (existing?.[metric] ?? 0) + delta;

  const { error: upsertError } = await supabase
    .from("revenue_snapshots")
    .upsert(
      {
        company_id: companyId,
        date: monthDate,
        mrr: existing?.mrr ?? 0,
        arr: existing?.arr ?? 0,
        new_mrr: metric === "new_mrr" ? nextValue : (existing?.new_mrr ?? 0),
        expansion_mrr: existing?.expansion_mrr ?? 0,
        churned_mrr: metric === "churned_mrr" ? nextValue : (existing?.churned_mrr ?? 0),
        source: "stripe",
      },
      { onConflict: "company_id,date" },
    );

  if (upsertError) throw upsertError;
}

async function updateSubscription(supabase: any, data: SubscriptionUpdate) {
  const payload = {
    stripe_customer_id: data.stripeCustomerId,
    stripe_subscription_id: data.stripeSubscriptionId,
    status: data.status,
    plan: data.plan,
    amount_cents: data.amountCents,
    currency: data.currency,
    current_period_start: data.currentPeriodStart || null,
    current_period_end: data.currentPeriodEnd || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("clerk_user_id", data.userId)
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
    .insert({ user_id: null, clerk_user_id: data.userId, ...payload });

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
      return publicError(403, "Forbidden", new Error("Invalid Stripe webhook signature"), req);
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
        const userIdFromMetadata = session.metadata?.clerk_user_id ?? session.metadata?.user_id;
        const planFromMetadata = normalizePlan(session.metadata?.plan, "smart");

        let userId = userIdFromMetadata ?? null;
        if (!userId) {
          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("clerk_user_id")
              .eq("email", customerEmail)
              .maybeSingle();

            userId = profile?.clerk_user_id ?? null;
          }
        }

        if (userId && typeof session.customer === "string" && typeof session.subscription === "string") {
          let currentPeriodStart: string | null = null;
          let currentPeriodEnd: string | null = null;
          let status = "pending_verification";
          let amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
          let currency = (session.currency ?? "brl").toLowerCase();
          let plan = planFromMetadata;

          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            if (!subscription) {
              throw new Error("Missing subscription payload from Stripe");
            }
            currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            status = normalizeStatus(subscription.status);
            amountCents = getSubscriptionAmountCents(subscription) || amountCents;
            currency = (subscription.currency ?? currency).toLowerCase();
            plan = getPlanFromSubscription(subscription, planFromMetadata);
          } catch (retrieveError) {
            logger.error("webhook.subscription_retrieve_failed", {
              event_id: event.id,
              stripe_subscription_id: session.subscription,
              message: retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
            });
            // TODO: Reconcile `pending_verification` subscriptions via scheduled cron to resolve transient Stripe failures.
            status = "pending_verification";
            currentPeriodStart = null;
            currentPeriodEnd = null;
          }

          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status,
            plan,
            amountCents,
            currency,
            currentPeriodStart,
            currentPeriodEnd,
          });

          const companyId = await getCompanyIdByClerkUserId(supabaseAdmin, userId);
          if (companyId) {
            await incrementSnapshotMetric(
              supabaseAdmin,
              companyId,
              getCurrentMonthDate(),
              "new_mrr",
              amountCents / 100,
            );
          }

          await writeAuditLog(supabaseAdmin, {
            action: "billing.webhook_checkout_completed",
            actorUserId: userId,
            metadata: {
              event_id: event.id,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              plan,
              amount_cents: amountCents,
            },
            source: "stripe_webhook",
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = getPlanFromSubscription(subscription, "smart");
        const status = normalizeStatus(subscription.status);
        const amountCents = getSubscriptionAmountCents(subscription);
        const currency = (subscription.currency ?? "brl").toLowerCase();

        let userId = subscription.metadata?.clerk_user_id ?? subscription.metadata?.user_id ?? null;

        if (!userId && typeof subscription.customer === "string") {
          const { data: existingSub } = await supabaseAdmin
            .from("subscriptions")
            .select("clerk_user_id")
            .eq("stripe_customer_id", subscription.customer)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          userId = existingSub?.clerk_user_id ?? null;
        }

        if (userId && typeof subscription.customer === "string") {
          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status,
            plan,
            amountCents,
            currency,
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
              amount_cents: amountCents,
            },
            source: "stripe_webhook",
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const amountCents = getSubscriptionAmountCents(subscription);
        const userIdFromMetadata = subscription.metadata?.clerk_user_id ?? subscription.metadata?.user_id ?? null;

        const { data: targetSubscription } = await supabaseAdmin
          .from("subscriptions")
          .select("id, clerk_user_id")
          .eq("stripe_subscription_id", subscription.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const targetUserId = userIdFromMetadata ?? targetSubscription?.clerk_user_id ?? null;

        if (targetSubscription?.id) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "cancelled",
              amount_cents: amountCents,
              currency: (subscription.currency ?? "brl").toLowerCase(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetSubscription.id);

          if (error) throw error;

          await writeAuditLog(supabaseAdmin, {
            action: "billing.webhook_subscription_deleted",
            actorUserId: targetUserId,
            metadata: {
              event_id: event.id,
              stripe_subscription_id: subscription.id,
              amount_cents: amountCents,
            },
            source: "stripe_webhook",
          });
        }

        if (targetUserId) {
          const companyId = await getCompanyIdByClerkUserId(supabaseAdmin, targetUserId);
          if (companyId) {
            await incrementSnapshotMetric(
              supabaseAdmin,
              companyId,
              getCurrentMonthDate(),
              "churned_mrr",
              amountCents / 100,
            );
          }
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.subscription !== "string") {
          break;
        }

        let userId: string | null = null;

        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          userId = subscription.metadata?.clerk_user_id ?? subscription.metadata?.user_id ?? null;
        } catch (subscriptionError) {
          logger.error("webhook.invoice_subscription_lookup_failed", {
            event_id: event.id,
            invoice_id: invoice.id,
            stripe_subscription_id: invoice.subscription,
            message: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError),
          });
        }

        if (!userId) {
          const { data: existingSub } = await supabaseAdmin
            .from("subscriptions")
            .select("clerk_user_id")
            .eq("stripe_subscription_id", invoice.subscription)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          userId = existingSub?.clerk_user_id ?? null;
        }

        if (!userId) {
          break;
        }

        const companyId = await getCompanyIdByClerkUserId(supabaseAdmin, userId);
        if (!companyId) {
          break;
        }

        const periodStart = typeof (invoice as { period_start?: number }).period_start === "number"
          ? (invoice as { period_start: number }).period_start
          : invoice.created;
        const monthDate = getMonthDate(periodStart);
        const amountPaid = (invoice.amount_paid ?? 0) / 100;

        const { data: existingSnapshot, error: existingSnapshotError } = await supabaseAdmin
          .from("revenue_snapshots")
          .select("new_mrr, expansion_mrr, churned_mrr")
          .eq("company_id", companyId)
          .eq("date", monthDate)
          .maybeSingle();

        if (existingSnapshotError) throw existingSnapshotError;

        const { error: snapshotUpsertError } = await supabaseAdmin
          .from("revenue_snapshots")
          .upsert(
            {
              company_id: companyId,
              date: monthDate,
              mrr: amountPaid,
              arr: amountPaid * 12,
              new_mrr: existingSnapshot?.new_mrr ?? 0,
              expansion_mrr: existingSnapshot?.expansion_mrr ?? 0,
              churned_mrr: existingSnapshot?.churned_mrr ?? 0,
              source: "stripe",
            },
            { onConflict: "company_id,date" },
          );

        if (snapshotUpsertError) throw snapshotUpsertError;

        await writeAuditLog(supabaseAdmin, {
          action: "billing.webhook_invoice_payment_succeeded",
          actorUserId: userId,
          metadata: {
            event_id: event.id,
            invoice_id: invoice.id,
            stripe_subscription_id: invoice.subscription,
            amount_paid: invoice.amount_paid ?? 0,
            month: monthDate,
          },
          source: "stripe_webhook",
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await writeAuditLog(supabaseAdmin, {
          action: "stripe.invoice.payment_failed",
          metadata: {
            event_id: event.id,
            invoice_id: invoice.id,
            customer: invoice.customer,
            subscription: invoice.subscription,
            amount_due: invoice.amount_due,
          },
          source: "stripe_webhook",
        });

        break;
      }

      default:
        logger.info("webhook.unhandled", { event_type: event.type, event_id: event.id });
    }

    logger.done("webhook.processed", { event_type: event.type, event_id: event.id });

    return jsonResponse({ received: true }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    logger.fail("webhook.failed", {
      status,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return respondWithPublicError(error, req);
  }
});
