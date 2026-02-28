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

---

## Release Captain Final Audit (2026-02-28T19:48:18Z)

### Scope and baseline
- Base SHA under release evaluation: `5330f16f6281f58284789800e7ba68959803ab6b`
- P0 commits present in sequence after base: `6b176df` -> `bba8fab` -> `5dc8318`
- Current head for this audit branch: `639b985` (`docs: add release audit evidence (pre-go live)`)
- Scope gate: `src/hooks/useAuth.tsx` is clean in this run and was not staged/committed.
- Scope evidence: `/tmp/release-audit/00-scope-gate.log`
- Commit order evidence: `/tmp/release-audit/00-commit-order.log`

### Phase 2 local gates (executed)

| # | Command | Expected | Exit | Result | Log |
|---|---|---|---|---|---|
| 1 | `npm run security:scan-secrets:strict` | PASS | 0 | PASS | `/tmp/release-audit/01-scan-secrets-strict.log` |
| 2 | `PATH='/usr/bin:/bin' bash scripts/scan-secrets.sh` | PASS | 0 | PASS | `/tmp/release-audit/02-scan-secrets-fallback.log` |
| 3 | `npm run ci:check` | PASS | 0 | PASS | `/tmp/release-audit/03-ci-check.log` |
| 4 | `APP_ENV=production APP_URL=https://example.com npm run release:preflight` | PASS | 0 | PASS | `/tmp/release-audit/04-preflight-prod-with-app-url.log` |
| 5 | `APP_ENV=production APP_URL='' npm run release:preflight` | FAIL esperado | 1 | PASS (expected fail) | `/tmp/release-audit/05-preflight-prod-missing-app-url.log` |
| 6 | `CI=true APP_ENV=development APP_URL='' npm run ops:healthcheck` | PASS | 0 | PASS | `/tmp/release-audit/06-healthcheck-ci-nonprod.log` |
| 7 | `bash scripts/db-restore-drill.sh --env staging --evidence-file /tmp/restore-drill-evidence.md` | PASS | 0 | PASS | `/tmp/release-audit/07-db-restore-drill-staging.log` |
| 8 | `bash scripts/db-restore-drill.sh --env production` (sem `--yes`) | FAIL esperado | 1 | PASS (expected fail) | `/tmp/release-audit/08-db-restore-drill-production-no-yes.log` |

Local gate summary file:
- `/tmp/release-audit/summary.txt`

Restore drill scaffold generated:
- `/tmp/restore-drill-evidence.md`

### Gate A (external): GitHub Actions CI on PR
- Branch: `release/go-live-20260228`
- PR URL: `https://github.com/vinicius788/gestorniq/pull/1`
- Actions run URL: `https://github.com/vinicius788/gestorniq/actions/runs/22527727408`
- Final status: `completed/success` (CI green)
- Evidence:
  - `/tmp/release-audit/20-pr-url.log`
  - `/tmp/release-audit/21-pr-checks.log`
  - `/tmp/release-audit/23-pr-checks-watch.log`
  - `/tmp/release-audit/24-run-list.json`

### Gate B (external): Supabase secrets (staging + production)
- Discovery result: repo defines only one `project_id` (`bjhpumlnvkpqdqlulnwq`) and does not declare separate `STAGING_REF` and `PROD_REF`.
- Input status: `MISSING_INPUT` for explicit staging/prod project refs.
- Runtime check on discovered project ref returned 403 (insufficient privileges).
- Token env status during audit: `SUPABASE_ACCESS_TOKEN=UNSET`.
- Gate B status: **FAIL / NO-GO**
- Evidence:
  - `/tmp/release-audit/30-supabase-ref-discovery.log`
  - `/tmp/release-audit/33-supabase-token-status.log`
  - `/tmp/release-audit/10-supabase-secrets-default-ref.log`

### Gate C (external): real APP_URL configured in deploy targets
- APP_URL is required in release mode and in required custom secrets (`README`, `.env.example`, `scripts/release-resources.sh`).
- Vercel CLI check failed because repository is not linked to a Vercel project (`vercel link` required).
- Input status: deployment/project mapping not configured in this workspace.
- Gate C status: **BLOCKED / NO-GO**
- Evidence:
  - `/tmp/release-audit/31-app-url-gate.log`
  - `/tmp/release-audit/11-vercel-env-ls.log`

### Gate D (external): Stripe E2E in staging
- Automated smoke command failed due missing required exported env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`).
- Manual E2E checklist prepared for required evidence collection.
- Gate D status: **REQUIRED_MANUAL_EVIDENCE / NO-GO**
- Evidence:
  - `/tmp/release-audit/12-smoke-staging.log`
  - `/tmp/release-audit/32-stripe-e2e-manual-checklist.log`

### Final verdict (production)
- GO / CONDITIONAL GO / NO-GO: **NO-GO**

Reason for NO-GO:
1. Gate B failed: Supabase secrets check cannot be completed for staging/prod due missing refs and 403 privilege error.
2. Gate C blocked: real APP_URL configuration for deployment environments cannot be verified (Vercel project not linked).
3. Gate D missing: Stripe E2E staging evidence not produced (smoke prerequisites not configured; manual evidence pending).
4. Restore drill runbook scaffold exists, but no real restore execution evidence (RTO/RPO measured) attached yet.

What must be done to reach GO (in order):
1. Provide explicit Supabase refs:
   - `STAGING_SUPABASE_PROJECT_REF=<staging_ref>`
   - `PROD_SUPABASE_PROJECT_REF=<prod_ref>`
2. Fix Supabase permissions/token and rerun:
   - `export SUPABASE_ACCESS_TOKEN=<owner_or_admin_token>`
   - `supabase link --project-ref <staging_ref>`
   - `SUPABASE_PROJECT_REF=<staging_ref> npm run supabase:secrets:check`
   - `supabase link --project-ref <prod_ref>`
   - `SUPABASE_PROJECT_REF=<prod_ref> npm run supabase:secrets:check`
3. Configure real APP_URL values in deployment envs and Supabase secrets:
   - staging: `APP_URL=https://staging.gestorniq.com`
   - production: `APP_URL=https://app.gestorniq.com`
4. Link Vercel project and verify envs:
   - `vercel link`
   - `vercel env ls`
5. Execute Stripe staging E2E and attach evidence:
   - `npm run smoke:staging`
   - add Stripe event IDs, webhook logs, checkout/portal screenshots.
6. Execute real staging restore drill and attach measured RTO/RPO + restore point evidence.
