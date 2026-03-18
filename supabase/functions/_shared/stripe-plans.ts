import { HttpError } from "./http.ts";

export type BillingPlan = "free" | "smart" | "pro";

const PLAN_ALIASES: Record<string, BillingPlan> = {
  free: "free",
  smart: "smart",
  standard: "smart",
  standard_annual: "smart",
  pro: "pro",
  gestor_pro: "pro",
};

const normalizeKey = (value: string | null | undefined): string =>
  (value ?? "").toLowerCase().trim();

const envValue = (key: string): string | null => {
  const value = Deno.env.get(key)?.trim();
  return value ? value : null;
};

const getSmartPriceIds = (): string[] => {
  const values = [
    envValue("STRIPE_PRICE_SMART_ANNUAL"),
    envValue("STRIPE_PRICE_STANDARD_ANNUAL"),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(values)];
};

const getProPriceIds = (): string[] => {
  const values = [envValue("STRIPE_PRICE_PRO_ANNUAL")].filter(
    (value): value is string => Boolean(value),
  );
  return [...new Set(values)];
};

export const normalizePlan = (
  plan: string | null | undefined,
  fallback: BillingPlan = "free",
): BillingPlan => {
  const normalized = normalizeKey(plan);
  if (!normalized) return fallback;
  return PLAN_ALIASES[normalized] ?? fallback;
};

export const resolveCheckoutPlan = (
  plan: string | null | undefined,
  planName: string | null | undefined,
): BillingPlan => {
  const rawValue = planName ?? plan;
  const normalized = normalizeKey(rawValue);

  if (!normalized) return "smart";
  if (!(normalized in PLAN_ALIASES)) {
    throw new HttpError(400, "plan must be smart or pro");
  }

  return PLAN_ALIASES[normalized];
};

export const resolveCheckoutPriceId = (plan: BillingPlan): string => {
  if (plan === "pro") {
    const proPrice = envValue("STRIPE_PRICE_PRO_ANNUAL");
    if (!proPrice) {
      throw new HttpError(500, "STRIPE_PRICE_PRO_ANNUAL is not configured");
    }
    return proPrice;
  }

  if (plan === "smart") {
    const smartPrice = envValue("STRIPE_PRICE_SMART_ANNUAL") ?? envValue("STRIPE_PRICE_STANDARD_ANNUAL");
    if (!smartPrice) {
      throw new HttpError(500, "STRIPE_PRICE_SMART_ANNUAL or STRIPE_PRICE_STANDARD_ANNUAL is not configured");
    }
    return smartPrice;
  }

  throw new HttpError(400, "Free plan does not require Stripe checkout");
};

export const getPlanFromPriceId = (
  priceId: string | null | undefined,
  fallback: BillingPlan = "free",
): BillingPlan => {
  const normalized = normalizeKey(priceId);
  if (!normalized) return fallback;
  if (getProPriceIds().includes(normalized)) return "pro";
  if (getSmartPriceIds().includes(normalized)) return "smart";
  return fallback;
};

export const getPlanFromSubscription = (
  subscription: {
    metadata?: Record<string, string>;
    items?: { data?: Array<{ price?: { id?: string | null } | null } | null> };
  },
  fallback: BillingPlan = "smart",
): BillingPlan => {
  const byMetadata = normalizePlan(subscription.metadata?.plan, fallback);
  if (byMetadata !== fallback) return byMetadata;

  const firstPriceId = subscription.items?.data?.[0]?.price?.id;
  return getPlanFromPriceId(firstPriceId, fallback);
};

export const getSubscriptionAmountCents = (
  subscription: {
    items?: {
      data?: Array<{
        quantity?: number | null;
        price?: { unit_amount?: number | null } | null;
      } | null>;
    };
  },
): number => {
  const lineItems = subscription.items?.data ?? [];

  return lineItems.reduce((total, item) => {
    if (!item?.price) return total;
    const unitAmount = item.price.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    return total + unitAmount * quantity;
  }, 0);
};
