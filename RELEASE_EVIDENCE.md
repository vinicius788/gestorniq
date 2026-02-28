# Release Evidence Template

## Release metadata
- Environment:
- Date/time (UTC):
- Release owner:
- Git SHA:
- Supabase project ref:
- Stripe account (staging/prod):

## Required resources snapshot
Command:
```bash
bash scripts/release-resources.sh summary
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Secrets check
Command:
```bash
npm run supabase:secrets:check
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Function deploy
Command:
```bash
npm run supabase:deploy
```
Output:
```text
PASTE_OUTPUT_HERE
```

Dashboard evidence:
- Functions screenshot path/link:
- Deploy IDs/log links:

## Release preflight
Command:
```bash
APP_ENV=production npm run release:preflight
```
Output:
```text
PASTE_OUTPUT_HERE
```

## Database migration evidence
Command:
```bash
supabase db push
```
Output:
```text
PASTE_OUTPUT_HERE
```

SQL verification snippets:
```sql
-- add SQL and output proving:
-- 1) write_audit_log execute permissions
-- 2) subscription webhook indexes
-- 3) plaintext guard trigger on stripe_connections
```

## Restore drill evidence (required before GO)
Command:
```bash
npm run ops:db-restore-drill -- --env staging
```
Evidence:
- Restore point timestamp:
- RTO:
- RPO:
- Validation SQL/log output:

## Stripe webhook evidence
- Endpoint URL:
- Endpoint ID:
- Event IDs tested:
- Signature validation proof (logs/screenshots):

## CORS evidence
Allowed-origin preflight command/output:
```text
PASTE_OUTPUT_HERE
```

Blocked-origin preflight command/output:
```text
PASTE_OUTPUT_HERE
```

## Smoke staging run
Command:
```bash
APP_ENV=production npm run smoke:staging
```
Output (`staging-smoke-evidence.txt`):
```text
PASTE_OUTPUT_HERE
```

Manual smoke screenshots/log links:
- signup/login/logout:
- demo mode persistence:
- checkout success:
- webhook processed:
- customer portal return:
- expired trial denied:
- sync-stripe-revenue denied without active access:

## CI and audit
Command:
```bash
npm run ci:check
npm audit --omit=dev --audit-level=high
```
Outputs:
```text
PASTE_OUTPUT_HERE
```

CI URL:

Moderate advisories tracked (non-blocking):
- package:
- advisory:
- mitigation owner/date:

## Final decision
- GO / CONDITIONAL GO / NO-GO:
- Risks accepted:
- Sign-off (engineering/product/security):

---

## Release Auditor Run (2026-02-28)

### 1) Scope isolation gate (required)
Commands executed:
```bash
git status --short --branch
git stash push -m "audit-isolation-useAuth" -- src/hooks/useAuth.tsx
git stash list | head -n 3
git status --short --branch
```

Observed output summary:
- Initial status was dirty due to out-of-scope local change: `M src/hooks/useAuth.tsx`.
- Out-of-scope change was isolated in `stash@{0}: On main: audit-isolation-useAuth`.
- Working tree became clean before running validation commands.

Restore instruction (to avoid losing isolated work):
```bash
git stash pop stash@{0}
```

### 2) Executed commands and evidence

| # | Command | Expected | Result | Evidence log |
|---|---|---|---|---|
| 1 | `npm run security:scan-secrets:strict` | PASS | PASS (`exit_code=0`) | `/tmp/release-audit/01-scan-secrets-strict.log` |
| 2 | `PATH='/usr/bin:/bin' bash scripts/scan-secrets.sh` | PASS + fallback without `rg` | PASS (`exit_code=0`) | `/tmp/release-audit/02-scan-secrets-fallback.log` |
| 3 | `npm run ci:check` | PASS | PASS (`exit_code=0`) | `/tmp/release-audit/03-ci-check.log` |
| 4 | `APP_ENV=production APP_URL=https://example.com npm run release:preflight` | PASS | PASS (`exit_code=0`) | `/tmp/release-audit/04-preflight-prod-with-app-url.log` |
| 5 | `APP_ENV=production APP_URL='' npm run release:preflight` | FAIL with clear message | PASS (expected FAIL occurred, `exit_code=1`) | `/tmp/release-audit/05-preflight-prod-missing-app-url.log` |
| 6 | `CI=true APP_ENV=development APP_URL='' npm run ops:healthcheck` | PASS | PASS (`exit_code=0`) | `/tmp/release-audit/06-healthcheck-ci-nonprod.log` |
| 7 | `bash scripts/db-restore-drill.sh --env staging --evidence-file /tmp/restore-drill-evidence.md` | PASS | PASS (`exit_code=0`) | `/tmp/release-audit/07-db-restore-drill-staging.log` |
| 8 | `bash scripts/db-restore-drill.sh --env production` (without `--yes`) | FAIL safety guard | PASS (expected FAIL occurred, `exit_code=1`) | `/tmp/release-audit/08-db-restore-drill-production-no-yes.log` |

Additional generated evidence:
- `/tmp/restore-drill-evidence.md`

### 3) Output summary (PASS/FAIL)
- Secret strict scan: PASS.
- Secret scan fallback without ripgrep: PASS, fallback message present.
- CI check (`lint + test + build + strict scan`): PASS (lint warnings only, no lint errors).
- Release preflight in production with `APP_URL`: PASS.
- Release preflight in production without `APP_URL`: expected FAIL with clear guardrail message.
- Non-production CI healthcheck without `APP_URL`: PASS with safe default `http://localhost:3000`.
- Restore drill staging planner: PASS and evidence file generated.
- Restore drill production without explicit `--yes`: expected FAIL (protection active).

### 4) Auditor conclusion
- GO / CONDITIONAL GO / NO-GO: **GO (for this validation scope)**
- Basis: all mandatory checks matched expected outcomes, including expected safety failures.
- Risks accepted: existing non-blocking lint warnings (`react-refresh/only-export-components`) remain outside this release-audit scope.
- Sign-off (engineering/product/security): pending manual sign-off.
