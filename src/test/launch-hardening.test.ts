import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePathFromProjectRoot: string): string {
  return readFileSync(resolve(process.cwd(), relativePathFromProjectRoot), "utf-8");
}

describe("launch hardening guardrails", () => {
  it("keeps checkout and portal redirecting to billing route with explicit success/cancel states", () => {
    const checkoutFn = readProjectFile("supabase/functions/create-checkout/index.ts");
    const portalFn = readProjectFile("supabase/functions/customer-portal/index.ts");

    expect(checkoutFn).toContain("success_url: `${baseUrl}/dashboard/billing?checkout=success`");
    expect(checkoutFn).toContain("cancel_url: `${baseUrl}/dashboard/billing?checkout=canceled`");
    expect(portalFn).toContain("return_url: `${baseUrl}/dashboard/billing?portal=return`");
  });

  it("fails fast when APP_URL is missing in production runtime", () => {
    const sharedHttp = readProjectFile("supabase/functions/_shared/http.ts");

    expect(sharedHttp).toContain("APP_URL must be configured in production");
    expect(sharedHttp).toContain("APP_URL missing, using SITE_URL fallback in non-production");
  });

  it("enforces paid access in RLS policies for all metric snapshot tables", () => {
    const migration = readProjectFile("supabase/migrations/20260220100000_phase_a_launch_blockers.sql");

    expect(migration).toContain("public.has_active_access(auth.uid())");
    expect(migration).toContain("ON public.revenue_snapshots");
    expect(migration).toContain("ON public.user_metrics");
    expect(migration).toContain("ON public.valuation_snapshots");
  });

  it("stores Stripe revenue connection keys encrypted at rest", () => {
    const connectFn = readProjectFile("supabase/functions/connect-stripe-revenue/index.ts");
    const syncFn = readProjectFile("supabase/functions/sync-stripe-revenue/index.ts");

    expect(connectFn).toContain("api_key_secret: null");
    expect(connectFn).toContain("api_key_secret_encrypted: encryptedSecret");
    expect(syncFn).toContain("decryptSecret(connection.api_key_secret_encrypted)");
  });

  it("keeps webhook processing idempotent by persisting processed Stripe event IDs", () => {
    const webhookFn = readProjectFile("supabase/functions/stripe-webhook/index.ts");
    const migration = readProjectFile("supabase/migrations/20260220122000_phase_c_encryption_observability.sql");

    expect(webhookFn).toContain('.from("stripe_webhook_events")');
    expect(webhookFn).toContain("duplicate: true");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.stripe_webhook_events");
  });

  it("introduces DB-backed rate limiting utility and function", () => {
    const rateLimitShared = readProjectFile("supabase/functions/_shared/rate-limit.ts");
    const migration = readProjectFile("supabase/migrations/20260220113000_phase_b_prelaunch_hardening.sql");

    expect(rateLimitShared).toContain('rpc("check_rate_limit"');
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.edge_rate_limits");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.check_rate_limit");
  });
});
