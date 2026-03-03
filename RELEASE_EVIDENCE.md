# Release Audit Evidence (Pre GO/NO-GO)

## Release metadata
- Date/time (UTC): 2026-03-03T11:53:19Z
- Release owner: Release Captain (Codex)
- Working branch: `release/go-live-20260303`
- HEAD SHA under validation: `73cc0614394d04c6c90539f74d43b9e7ec07821d`
- Base SHA requested: `5330f16f6281f58284789800e7ba68959803ab6b`
- Notes:
  - Branch was rebuilt from `5330f16` and cherry-picked in required order:
    - `6b176df` -> `a76a363`
    - `bba8fab` -> `20ecadf`
    - `5dc8318` -> `73cc061`

## Phase 0 - Scope gate (mandatory)
- Command log: `/tmp/release-audit/00-scope-gate-status.log`
- Commands run:
  - `git status`
  - `git status --short src/hooks/useAuth.tsx`
- Result: `PASS`
- Exit code: `0`
- Evidence:
  - Working tree clean before release audit operations.
  - `src/hooks/useAuth.tsx` was not modified; no stash isolation required.

## Phase 1 - Commit order gate
- Command log: `/tmp/release-audit/00-commit-order.log`
- Command run: `git log --oneline -10`
- Result: `PASS`
- Exit code: `0`
- Evidence:
  - Top 3 commits are exactly the expected P0 sequence (cherry-picked equivalents):
    1. `73cc061` (`5dc8318` equivalent)
    2. `20ecadf` (`bba8fab` equivalent)
    3. `a76a363` (`6b176df` equivalent)

## Phase 2 - Local gates with logs
1. `npm run security:scan-secrets:strict`
   - Status: `PASS`
   - Exit code: `0`
   - Log: `/tmp/release-audit/01-security-scan-secrets-strict.log`
2. `PATH='/usr/bin:/bin' bash scripts/scan-secrets.sh`
   - Status: `PASS` (fallback path exercised)
   - Exit code: `0`
   - Log: `/tmp/release-audit/02-scan-secrets-path-fallback.log`
3. `npm run ci:check`
   - Status: `PASS`
   - Exit code: `0`
   - Log: `/tmp/release-audit/03-ci-check.log`
4. `APP_ENV=production APP_URL=https://example.com npm run release:preflight`
   - Status: `PASS` (expected)
   - Exit code: `0`
   - Log: `/tmp/release-audit/04-release-preflight-prod-valid-url.log`
5. `APP_ENV=production APP_URL='' npm run release:preflight`
   - Status: `PASS` (expected fail behavior verified)
   - Exit code: `1`
   - Log: `/tmp/release-audit/05-release-preflight-prod-empty-url-expected-fail.log`
6. `CI=true APP_ENV=development APP_URL='' npm run ops:healthcheck`
   - Status: `PASS` (expected)
   - Exit code: `0`
   - Log: `/tmp/release-audit/06-ops-healthcheck-dev-ci.log`
7. `bash scripts/db-restore-drill.sh --env staging --evidence-file /tmp/restore-drill-evidence.md`
   - Status: `PASS` (drill scaffold generated, non-destructive)
   - Exit code: `0`
   - Log: `/tmp/release-audit/07-db-restore-drill-staging.log`
   - Evidence file: `/tmp/restore-drill-evidence.md`
8. `bash scripts/db-restore-drill.sh --env production` (without `--yes`)
   - Status: `PASS` (expected fail behavior verified)
   - Exit code: `1`
   - Log: `/tmp/release-audit/08-db-restore-drill-production-without-yes-expected-fail.log`

## Phase 4 - External gate A (GitHub Actions CI on PR)
- Status: `PASS`
- PR URL: `https://github.com/vinicius788/gestorniq/pull/2`
- Actions run URL: `https://github.com/vinicius788/gestorniq/actions/runs/22621835491`
- Checks output logs:
  - Initial (pending): `/tmp/release-audit/14-gh-pr-checks.log`
  - Final (green): `/tmp/release-audit/14b-gh-pr-checks-final.log`
  - Run list initial: `/tmp/release-audit/15-gh-run-list.log`
  - Run list final: `/tmp/release-audit/15b-gh-run-list-final.log`
- Final check conclusion: `validate = pass`

## Phase 5 - External gate B (Supabase secrets: staging + production)
- Discovery logs:
  - `/tmp/release-audit/10-phase5-discovery.log`
  - `/tmp/release-audit/11-supabase-projects-list.log`
- Discovery outcome:
  - Found only one repo-linked project ref in `supabase/config.toml`: `bjhpumlnvkpqdqlulnwq`
  - Could not find explicit mapping for both `STAGING_REF` and `PROD_REF` in repo.
- Status: `MISSING_INPUT`
- Required inputs missing:
  - `STAGING_REF` (Supabase project ref for staging)
  - `PROD_REF` (Supabase project ref for production)
- Required secret keys to validate for each env (from `scripts/release-resources.sh`):
  - `APP_ENV`
  - `APP_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_STANDARD_ANNUAL`
  - `STRIPE_CONNECTIONS_ENCRYPTION_KEY`
- Present/missing per env: `NOT_EVALUATED` (blocked by missing refs)

## Phase 6 - External gate C (real APP_URL configured for staging/prod)
- Command log: `/tmp/release-audit/12-vercel-env-ls.log`
- Command run: `vercel env ls`
- Outcome: command failed because repo is not linked to a Vercel project.
- Status: `BLOCKED`
- Exit code: `1`
- APP_URL config targets identified:
  - Supabase project secrets (`APP_URL` is required in release resources)
  - Hosting environment variables (Vercel project envs, if frontend host is Vercel)
- Required values:
  - `APP_URL=https://staging.gestorniq.com`
  - `APP_URL=https://app.gestorniq.com`

## Phase 7 - External gate D (Stripe E2E in staging)
- Automation found: `npm run smoke:staging` -> `scripts/smoke-staging.sh`
- Command log: `/tmp/release-audit/13-smoke-staging.log`
- Smoke evidence file: `/tmp/release-audit/13-smoke-staging-evidence.txt`
- Command run:
  - `SMOKE_EVIDENCE_FILE=/tmp/release-audit/13-smoke-staging-evidence.txt APP_ENV=production APP_URL=https://staging.gestorniq.com npm run smoke:staging`
- Status: `FAIL`
- Exit code: `1`
- Failure detail:
  - Script error: `scripts/smoke-staging.sh: line 14: $1: unbound variable`
  - Automated Stripe staging smoke is currently not viable.
- Required manual evidence (`REQUIRED_MANUAL_EVIDENCE`):
  1. Checkout test mode completes successfully.
  2. Redirect after checkout is correct.
  3. Webhook processes exactly once.
  4. Customer portal opens correctly.
  5. No `5xx` errors in function/runtime logs.

## Phase 8 - Final decision (current state)
- Verdict: `NO-GO`
- Rationale:
  - Gate B (`Supabase secrets`) is `MISSING_INPUT`.
  - Gate C (`APP_URL real config`) is `BLOCKED`.
  - Gate D (`Stripe E2E staging`) is `FAIL`.
  - Gate A (`GitHub Actions CI on PR`) is `PASS`.
- Exact blockers to clear (ordered):
  1. Provide `STAGING_REF` and `PROD_REF`.
     - Then run:
       - `supabase link --project-ref <STAGING_REF>`
       - `SUPABASE_PROJECT_REF=<STAGING_REF> npm run supabase:secrets:check`
       - `supabase link --project-ref <PROD_REF>`
       - `SUPABASE_PROJECT_REF=<PROD_REF> npm run supabase:secrets:check`
  2. Configure and evidence `APP_URL` for staging and production.
     - Vercel:
       - `vercel link`
       - `vercel env ls`
       - Ensure:
         - `APP_URL=https://staging.gestorniq.com` (preview/staging scope)
         - `APP_URL=https://app.gestorniq.com` (production scope)
     - Supabase secrets: verify `APP_URL` present on both refs.
  3. Produce Stripe staging E2E evidence.
     - Option A: fix `scripts/smoke-staging.sh` runtime error and rerun.
     - Option B: execute the 5-step manual checklist above and attach logs/screenshots.
