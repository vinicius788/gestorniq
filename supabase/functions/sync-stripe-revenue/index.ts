import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { decryptSecret, encryptSecret } from "../_shared/encryption.ts";
import {
  getCorsHeaders,
  getRequiredEnv,
  HttpError,
  isProductionRuntime,
  jsonResponse,
} from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const STRIPE_STATUSES: Stripe.SubscriptionListParams.Status[] = [
  "active",
  "trialing",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
];

const BILLABLE_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

const INCREMENTAL_FILTERABLE_STATUSES = new Set<Stripe.SubscriptionListParams.Status>([
  "canceled",
  "incomplete",
  "incomplete_expired",
]);

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toMonthlyAmount(subscription: Stripe.Subscription): number {
  const items = subscription.items?.data ?? [];
  let cents = 0;

  for (const item of items) {
    const recurring = item.price?.recurring;
    const unitAmount = item.price?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    if (!recurring || unitAmount <= 0) continue;

    const intervalCount = recurring.interval_count ?? 1;
    let monthlyItemCents = unitAmount * quantity;

    switch (recurring.interval) {
      case "day":
        monthlyItemCents = monthlyItemCents * (30 / intervalCount);
        break;
      case "week":
        monthlyItemCents = monthlyItemCents * (52 / 12 / intervalCount);
        break;
      case "month":
        monthlyItemCents = monthlyItemCents / intervalCount;
        break;
      case "year":
        monthlyItemCents = monthlyItemCents / (12 * intervalCount);
        break;
      default:
        monthlyItemCents = 0;
    }

    cents += monthlyItemCents;
  }

  return roundCurrency(cents / 100);
}

function getStartTimestamp(subscription: Stripe.Subscription): number {
  return subscription.start_date ?? subscription.created;
}

function getEndTimestamp(subscription: Stripe.Subscription): number | null {
  const candidates = [
    subscription.ended_at,
    subscription.canceled_at,
    subscription.cancel_at,
    subscription.cancel_at_period_end ? subscription.current_period_end : null,
  ].filter((value): value is number => typeof value === "number" && value > 0);

  if (candidates.length > 0) {
    return Math.min(...candidates);
  }

  if (subscription.status === "canceled" && subscription.current_period_end) {
    return subscription.current_period_end;
  }

  return null;
}

function isActiveAtMonthEnd(
  subscription: Stripe.Subscription,
  monthEndTs: number,
  startTs: number,
  endTs: number | null,
): boolean {
  if (startTs > monthEndTs) return false;
  if (endTs !== null && endTs <= monthEndTs) return false;
  if (BILLABLE_STATUSES.has(subscription.status)) return true;

  return endTs !== null && endTs > monthEndTs;
}

interface MonthBucket {
  date: string;
  startTs: number;
  endTs: number;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  expansionMrr: number;
}

function buildMonthBuckets(months: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999));

    buckets.push({
      date: monthStart.toISOString().slice(0, 10),
      startTs: Math.floor(monthStart.getTime() / 1000),
      endTs: Math.floor(monthEnd.getTime() / 1000),
      mrr: 0,
      newMrr: 0,
      churnedMrr: 0,
      expansionMrr: 0,
    });
  }

  return buckets;
}

async function listSubscriptionsByStatus(
  stripe: Stripe,
  status: Stripe.SubscriptionListParams.Status,
  createdGte?: number,
) {
  const collected: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined = undefined;

  while (hasMore) {
    const query: Stripe.SubscriptionListParams = {
      status,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      ...(createdGte ? { created: { gte: createdGte } } : {}),
    };

    const response = await stripe.subscriptions.list(query);

    collected.push(...response.data);
    hasMore = response.has_more;
    startingAfter = response.data.length > 0 ? response.data[response.data.length - 1].id : undefined;
  }

  return collected;
}

function parseSinceIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function hasActiveAccessForUser(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("has_active_access", { user_uuid: userId });
  if (error) {
    throw new HttpError(500, `Failed to validate active access: ${error.message}`);
  }

  return data === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("sync-stripe-revenue", req);

  let supabaseAdmin: any | null = null;
  let connectionCompanyId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const enforceEncryptedSecretKey = isProductionRuntime();

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new HttpError(401, `Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new HttpError(401, "User not authenticated");
    logger.setUserId(user.id);

    await enforceRateLimit({
      req,
      supabaseAdmin,
      scope: "sync-stripe-revenue",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 300, maxRequests: 3 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 12 },
      ],
    });

    const hasInitialAccess = await hasActiveAccessForUser(supabaseAdmin, user.id);
    if (!hasInitialAccess) {
      throw new HttpError(403, "Active subscription or trial required");
    }

    const body = await req.json().catch(() => ({}));
    const companyIdFromBody = typeof body.company_id === "string" ? body.company_id : null;
    const monthsRaw = typeof body.months === "number" ? body.months : 12;
    const months = Math.min(24, Math.max(3, Math.floor(monthsRaw)));
    const fullSync = body.full_sync === true;

    let companyQuery = supabaseClient.from("companies").select("id").eq("user_id", user.id);
    if (companyIdFromBody) {
      companyQuery = companyQuery.eq("id", companyIdFromBody);
    }

    const { data: company, error: companyError } = await companyQuery.maybeSingle();
    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(404, "Company not found");
    connectionCompanyId = company.id;

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("stripe_connections")
      .select(
        "api_key_secret, api_key_secret_encrypted, stripe_account_id, last_synced_at, sync_status, sync_in_progress_at",
      )
      .eq("company_id", company.id)
      .maybeSingle();

    if (connectionError) throw new HttpError(500, connectionError.message);
    if (!connection) throw new HttpError(404, "Stripe revenue connection not found");

    const syncStartedAt = new Date().toISOString();
    const runningSince = connection.sync_in_progress_at ? Date.parse(connection.sync_in_progress_at) : NaN;
    if (
      connection.sync_status === "running" &&
      Number.isFinite(runningSince) &&
      Date.now() - runningSince < 15 * 60 * 1000
    ) {
      throw new HttpError(409, "A sync is already running. Please retry in a few minutes.");
    }

    const { error: lockError } = await supabaseAdmin
      .from("stripe_connections")
      .update({
        sync_status: "running",
        sync_in_progress_at: syncStartedAt,
        updated_at: syncStartedAt,
      })
      .eq("company_id", company.id);

    if (lockError) throw new HttpError(500, lockError.message);

    let stripeApiKey: string | null = null;

    if (connection.api_key_secret_encrypted) {
      stripeApiKey = await decryptSecret(connection.api_key_secret_encrypted);
    } else if (connection.api_key_secret) {
      if (enforceEncryptedSecretKey) {
        // Production requires the encryption key even when migrating legacy plaintext records.
        getRequiredEnv("STRIPE_CONNECTIONS_ENCRYPTION_KEY");
      }

      stripeApiKey = connection.api_key_secret;

      // One-way migration from legacy plaintext to encrypted-at-rest.
      try {
        const encrypted = await encryptSecret(connection.api_key_secret);
        await supabaseAdmin
          .from("stripe_connections")
          .update({
            api_key_secret: null,
            api_key_secret_encrypted: encrypted,
            encryption_version: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", company.id);
      } catch (migrationError) {
        if (enforceEncryptedSecretKey) {
          throw new HttpError(
            500,
            migrationError instanceof Error
              ? migrationError.message
              : "Failed to encrypt legacy Stripe connection secret",
          );
        }

        logger.error("stripe_revenue.secret_migration_failed", {
          message: migrationError instanceof Error ? migrationError.message : String(migrationError),
        });
      }
    }

    if (!stripeApiKey) {
      throw new HttpError(404, "Stripe revenue connection secret not found");
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: "2025-08-27.basil" });

    const requestedSinceIso = parseSinceIso(body.since);
    const fallbackSinceIso = connection.last_synced_at
      ? new Date(new Date(connection.last_synced_at).getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const effectiveSinceIso = fullSync ? null : requestedSinceIso ?? fallbackSinceIso;
    const createdGte = effectiveSinceIso ? Math.floor(new Date(effectiveSinceIso).getTime() / 1000) : undefined;

    const statusResults = await Promise.all(
      STRIPE_STATUSES.map(async (status) => {
        const shouldFilterIncremental = Boolean(createdGte) && INCREMENTAL_FILTERABLE_STATUSES.has(status);
        const records = await listSubscriptionsByStatus(
          stripe,
          status,
          shouldFilterIncremental ? createdGte : undefined,
        );

        return { status, records };
      }),
    );

    const subscriptionsMap = new Map<string, Stripe.Subscription>();
    const statusBreakdown: Record<string, number> = {};

    for (const { status, records } of statusResults) {
      statusBreakdown[status] = records.length;
      for (const sub of records) {
        subscriptionsMap.set(sub.id, sub);
      }
    }

    const subscriptions = [...subscriptionsMap.values()];
    const buckets = buildMonthBuckets(months);

    for (const sub of subscriptions) {
      const monthlyAmount = toMonthlyAmount(sub);
      if (monthlyAmount <= 0) continue;

      const startTs = getStartTimestamp(sub);
      const endTs = getEndTimestamp(sub);

      for (const bucket of buckets) {
        if (isActiveAtMonthEnd(sub, bucket.endTs, startTs, endTs)) {
          bucket.mrr += monthlyAmount;
        }

        if (startTs >= bucket.startTs && startTs <= bucket.endTs) {
          bucket.newMrr += monthlyAmount;
        }

        if (endTs !== null && endTs >= bucket.startTs && endTs <= bucket.endTs) {
          bucket.churnedMrr += monthlyAmount;
        }
      }
    }

    for (let i = 0; i < buckets.length; i += 1) {
      const bucket = buckets[i];
      bucket.mrr = roundCurrency(bucket.mrr);
      bucket.newMrr = roundCurrency(bucket.newMrr);
      bucket.churnedMrr = roundCurrency(bucket.churnedMrr);

      if (i === 0) {
        bucket.expansionMrr = 0;
        continue;
      }

      const previous = buckets[i - 1];
      const delta = bucket.mrr - previous.mrr;
      const expansionEstimate = delta - bucket.newMrr + bucket.churnedMrr;
      bucket.expansionMrr = roundCurrency(Math.max(0, expansionEstimate));
    }

    const upsertRows = buckets.map((bucket) => ({
      company_id: company.id,
      date: bucket.date,
      mrr: bucket.mrr,
      new_mrr: bucket.newMrr,
      expansion_mrr: bucket.expansionMrr,
      churned_mrr: bucket.churnedMrr,
      source: "stripe",
    }));

    const { error: upsertError } = await supabaseAdmin
      .from("revenue_snapshots")
      .upsert(upsertRows, { onConflict: "company_id,date" });

    if (upsertError) throw new HttpError(500, upsertError.message);

    const nowIso = new Date().toISOString();

    const { error: updateConnectionError } = await supabaseAdmin
      .from("stripe_connections")
      .update({
        status: "connected",
        last_synced_at: nowIso,
        sync_status: "idle",
        sync_in_progress_at: null,
        updated_at: nowIso,
      })
      .eq("company_id", company.id);

    if (updateConnectionError) throw new HttpError(500, updateConnectionError.message);

    const { error: companyUpdateError } = await supabaseAdmin
      .from("companies")
      .update({
        data_source: "stripe",
        updated_at: nowIso,
      })
      .eq("id", company.id);

    if (companyUpdateError) throw new HttpError(500, companyUpdateError.message);

    const hasAccessBeforeResponse = await hasActiveAccessForUser(supabaseAdmin, user.id);
    if (!hasAccessBeforeResponse) {
      logger.info("stripe_revenue.sync_denied_no_active_access", {
        company_id: company.id,
      });
      return jsonResponse({ error: "Active subscription or trial required" }, 403, {}, req);
    }

    const latest = buckets[buckets.length - 1] ?? null;

    await writeAuditLog(supabaseAdmin, {
      action: "billing.stripe_revenue_synced",
      companyId: company.id,
      actorUserId: user.id,
      actorIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      metadata: {
        months,
        full_sync: fullSync,
        since: effectiveSinceIso,
        subscriptions_processed: subscriptions.length,
      },
    });

    logger.done("stripe_revenue.sync_completed", {
      company_id: company.id,
      months,
      full_sync: fullSync,
      since: effectiveSinceIso,
      subscriptions_processed: subscriptions.length,
    });

    return jsonResponse({
      synced: true,
      company_id: company.id,
      sync_mode: fullSync ? "full" : "incremental",
      since: effectiveSinceIso,
      months_synced: months,
      subscriptions_processed: subscriptions.length,
      status_breakdown: statusBreakdown,
      latest_snapshot: latest
        ? {
            date: latest.date,
            mrr: latest.mrr,
            new_mrr: latest.newMrr,
            expansion_mrr: latest.expansionMrr,
            churned_mrr: latest.churnedMrr,
          }
        : null,
    }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("stripe_revenue.sync_failed", { status, message, company_id: connectionCompanyId });

    if (supabaseAdmin && connectionCompanyId) {
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from("stripe_connections")
        .update({
          sync_status: "error",
          sync_in_progress_at: null,
          updated_at: nowIso,
        })
        .eq("company_id", connectionCompanyId);
    }

    return jsonResponse({ error: message }, status, {}, req);
  }
});
