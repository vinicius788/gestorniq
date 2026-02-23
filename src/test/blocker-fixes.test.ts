import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePathFromProjectRoot: string): string {
  return readFileSync(resolve(process.cwd(), relativePathFromProjectRoot), "utf-8");
}

describe("blocker fixes", () => {
  it("denies sync-stripe-revenue without active access before sync and before response payload", () => {
    const syncFn = readProjectFile("supabase/functions/sync-stripe-revenue/index.ts");
    const accessCheckCount = (syncFn.match(/hasActiveAccessForUser\(supabaseAdmin, user\.id\)/g) ?? []).length;

    expect(syncFn).toContain('.rpc("has_active_access"');
    expect(accessCheckCount).toBeGreaterThanOrEqual(2);
    expect(syncFn).toContain('throw new HttpError(403, "Active subscription or trial required")');
    expect(syncFn).toContain('return jsonResponse({ error: "Active subscription or trial required" }, 403, {}, req);');
  });

  it("prevents audit actor forgery by revoking write_audit_log from authenticated", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260222143000_phase_d_security_and_subscription_indexes.sql",
    );

    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) FROM authenticated;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) TO service_role;",
    );
    expect(migration).toContain("has_function_privilege");
  });

  it("enforces release APP_URL + required Supabase function/table checks in healthcheck", () => {
    const healthcheck = readProjectFile("scripts/healthcheck.sh");
    const resources = readProjectFile("scripts/release-resources.sh");

    expect(resources).toContain("production|prod|staging|stage|release");
    expect(healthcheck).toContain("APP_URL is required in release mode");
    expect(healthcheck).toContain('source "${SCRIPT_DIR}/release-resources.sh"');
    expect(resources).toContain("REQUIRED_EDGE_FUNCTIONS=(");
    expect(resources).toContain("REQUIRED_TABLES=(");
  });

  it("uses environment-aware CORS headers in shared HTTP util", () => {
    const sharedHttp = readProjectFile("supabase/functions/_shared/http.ts");

    expect(sharedHttp).toContain("getCorsHeaders");
    expect(sharedHttp).toContain("CORS_ALLOW_ALL_LOCAL");
    expect(sharedHttp).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("adds rate limiting and cache hints to check-subscription", () => {
    const checkSubscriptionFn = readProjectFile("supabase/functions/check-subscription/index.ts");

    expect(checkSubscriptionFn).toContain('scope: "check-subscription"');
    expect(checkSubscriptionFn).toContain('{ name: "burst", windowSeconds: 120, maxRequests: 6 }');
    expect(checkSubscriptionFn).toContain(
      '"Cache-Control": "private, max-age=30, stale-while-revalidate=30"',
    );
  });

  it("persists onboarding completion in DB when demo mode is selected", () => {
    const wizard = readProjectFile("src/components/dashboard/OnboardingWizard.tsx");

    expect(wizard).toContain("const handleUseDemoMode = async () =>");
    expect(wizard).toContain("await updateCompany({");
    expect(wizard).toContain("data_source: 'demo'");
    expect(wizard).toContain("onboarding_completed: true");
    expect(wizard).toContain("onboarding_completed_at: new Date().toISOString()");
  });

  it("adds release automation scripts for deploy, secrets check, and strict preflight", () => {
    const packageJson = readProjectFile("package.json");
    const deployScript = readProjectFile("scripts/supabase-deploy.sh");
    const secretsCheckScript = readProjectFile("scripts/supabase-secrets-check.sh");
    const preflightScript = readProjectFile("scripts/release-preflight.sh");

    expect(packageJson).toContain('"supabase:deploy": "bash scripts/supabase-deploy.sh"');
    expect(packageJson).toContain('"supabase:secrets:check": "bash scripts/supabase-secrets-check.sh"');
    expect(packageJson).toContain('"release:preflight": "bash scripts/release-preflight.sh"');
    expect(deployScript).toContain("REQUIRED_EDGE_FUNCTIONS");
    expect(secretsCheckScript).toContain("REQUIRED_CUSTOM_SECRETS");
    expect(preflightScript).toContain("APP_ENV=production HEALTHCHECK_STRICT=1");
  });

  it("guards against plaintext stripe connection writes and provides backfill path", () => {
    const guardMigration = readProjectFile(
      "supabase/migrations/20260223120000_phase_e_stripe_secret_plaintext_guard.sql",
    );
    const backfillFn = readProjectFile("supabase/functions/backfill-stripe-secrets/index.ts");
    const syncFn = readProjectFile("supabase/functions/sync-stripe-revenue/index.ts");

    expect(guardMigration).toContain("guard_stripe_connection_secret_storage");
    expect(guardMigration).toContain("Plaintext api_key_secret writes are not allowed");
    expect(backfillFn).toContain('if (claims.role !== "service_role")');
    expect(backfillFn).toContain("api_key_secret_encrypted");
    expect(syncFn).toContain("isProductionRuntime()");
    expect(syncFn).toContain('getRequiredEnv("STRIPE_CONNECTIONS_ENCRYPTION_KEY")');
  });
});
