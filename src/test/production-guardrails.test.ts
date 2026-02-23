import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePathFromProjectRoot: string): string {
  return readFileSync(resolve(process.cwd(), relativePathFromProjectRoot), "utf-8");
}

describe("production guardrails", () => {
  it("keeps JWT verification policy aligned for sensitive edge functions", () => {
    const configToml = readProjectFile("supabase/config.toml");

    const expectations: Array<{ functionName: string; verifyJwt: boolean }> = [
      { functionName: "create-checkout", verifyJwt: true },
      { functionName: "customer-portal", verifyJwt: true },
      { functionName: "check-subscription", verifyJwt: true },
      { functionName: "stripe-webhook", verifyJwt: false },
      { functionName: "connect-stripe-revenue", verifyJwt: true },
      { functionName: "stripe-revenue-status", verifyJwt: true },
      { functionName: "sync-stripe-revenue", verifyJwt: true },
      { functionName: "disconnect-stripe-revenue", verifyJwt: true },
      { functionName: "backfill-stripe-secrets", verifyJwt: true },
    ];

    expectations.forEach(({ functionName, verifyJwt }) => {
      const pattern = new RegExp(
        `\\[functions\\.${functionName}\\][\\s\\S]*?verify_jwt\\s*=\\s*${verifyJwt}`,
      );

      expect(
        pattern.test(configToml),
        `Expected [functions.${functionName}] verify_jwt = ${verifyJwt}`,
      ).toBe(true);
    });
  });
});
