const PLAN_ID_TO_SLUG = [
  [import.meta.env.VITE_STRIPE_SMART_PRICE_ID, "smart"],
  [import.meta.env.VITE_STRIPE_PRO_PRICE_ID, "pro"],
] as const;

export const STRIPE_PLAN_MAP: Record<string, string> = Object.fromEntries(
  PLAN_ID_TO_SLUG.filter(([priceId]) => Boolean(priceId)),
);

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  smart: "Smart",
  pro: "Pro",
};

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  smart: 79.9,
  pro: 199.9,
};

export function normalizePlan(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  return STRIPE_PLAN_MAP[priceId] || "free";
}

export function formatPlanLabel(plan: string | null | undefined): string {
  const normalized = (plan ?? "free").toLowerCase().trim();
  return PLAN_LABELS[normalized] ?? PLAN_LABELS.free;
}

export function formatSubscriptionAmount(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
): string {
  const value = (amountCents ?? 0) / 100;
  const currencyCode = (currency ?? "BRL").toUpperCase();

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}
