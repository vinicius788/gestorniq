# GestorNiq (Founder Metrics Studio)

Web SaaS for founders to track SaaS metrics (MRR/ARR, user growth, valuation, forecast) with Supabase-backed data access, Stripe billing (annual Standard plan), and Stripe revenue sync.

## Stack
- React + TypeScript + Vite
- Supabase (Auth, Postgres, RLS, Edge Functions)
- Stripe (Checkout, Billing Portal, Webhook)
- Clerk (auth provider with Supabase session bridge)

## Local development
```bash
npm install
npm run dev
```

## Validation
```bash
npm run lint
npm run test
npm run build
npm run security:scan-secrets
npm run ops:healthcheck
npm run ops:db-restore-drill -- --env staging
npm run ci:check
npm run audit:high
```

For stricter checks in CI/release pipelines:
```bash
SCAN_ENV_POLICY=1 npm run security:scan-secrets
APP_ENV=production npm run ops:healthcheck
```

`ops:healthcheck` behavior:
- `production/staging/release`: missing `APP_URL`, required functions, or required tables => hard fail.
- local/dev: missing remote services are reported as warnings unless `HEALTHCHECK_STRICT=1`.
- non-release checks default `APP_URL` to `http://localhost:3000` when unset, without relaxing release guardrails.

## Release automation
One-command Supabase provisioning (migrations + edge functions + healthcheck):
```bash
npm run supabase:provision
```

One-command staging flow:
```bash
npm run release:staging
```

Equivalent step-by-step:
```bash
# 1) verify Supabase secrets for target project
npm run supabase:secrets:check

# 2) apply pending database migrations
npm run supabase:db:push

# 3) deploy required edge functions
npm run supabase:deploy

# 4) strict production preflight
npm run release:preflight

# 5) run staging smoke suite (automated + manual checklist scaffold)
npm run smoke:staging
```

Source of truth for required functions/tables/secrets:
```bash
bash scripts/release-resources.sh summary
```

Dependency gate policy:
- `npm run audit:high` blocks CI/release on high/critical advisories.
- Moderate advisories are non-blocking but must be recorded in `RELEASE_EVIDENCE.md` with mitigation owner/date.

## Environment
Use `.env.example` as the template.

Operational scripts (`supabase:*`, `ops:healthcheck`, `release:*`) auto-load `.env.local` and `.env` defaults when variables are not already exported.

Frontend variables:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SENTRY_DSN` (optional)
- `VITE_CLERK_PUBLISHABLE_KEY` (if Clerk is enabled)
- `VITE_CLERK_SUPABASE_JWT_TEMPLATE`

Supabase Edge Function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STANDARD_ANNUAL`
- `APP_URL` (required in production/staging/release)
- `APP_ENV` (`production` in deployed environments)
- `STRIPE_CONNECTIONS_ENCRYPTION_KEY` (base64 32-byte key)
- `CORS_ALLOWED_ORIGINS` (optional comma-separated allowlist; defaults to `APP_URL`/`SITE_URL`)
- `CORS_ALLOW_ALL_LOCAL` (optional; set to `true` only for permissive local CORS)

Supabase CLI migration push:
- `SUPABASE_DB_PASSWORD` (optional but recommended for non-interactive `supabase:db:push`)

Recommended `CORS_ALLOWED_ORIGINS`:
- production: `https://app.gestorniq.com`
- staging: `https://staging.gestorniq.com`
- optional staging previews only: `https://*.vercel.app`

Do not enable `CORS_ALLOW_ALL_LOCAL` in production.

## Security operations
- Secret rotation procedure: `SECURITY_ROTATION_RUNBOOK.md`
- Go-live operational checklist: `GO_LIVE_CHECKLIST.md`
- Release evidence template: `RELEASE_EVIDENCE.md`

## Stripe revenue sync
- Connect Stripe from `Settings` using a read-only-capable key when possible.
- Sync writes monthly snapshots to `revenue_snapshots` with `source = 'stripe'`.
- Related functions:
  - `connect-stripe-revenue`
  - `stripe-revenue-status`
  - `sync-stripe-revenue`
  - `disconnect-stripe-revenue`

Legacy plaintext secret migration helper:
```bash
# dry-run
bash scripts/backfill-stripe-secrets.sh --dry-run

# apply
bash scripts/backfill-stripe-secrets.sh --apply
```
# gestorniq
