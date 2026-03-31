# Security Rotation Runbook

This runbook defines the required secret rotation process for GestorNiq production.

## Scope
Rotate these secrets on a fixed cadence (every 90 days) and immediately on suspected exposure:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- Clerk secrets (`CLERK_SECRET_KEY`, affected publishable keys/templates if needed)
- `STRIPE_CONNECTIONS_ENCRYPTION_KEY` (if rotating encryption key, follow migration strategy below)

## Mandatory rotation order
Apply in this exact order to avoid partial outages:
1. `STRIPE_SECRET_KEY`
2. `STRIPE_WEBHOOK_SECRET`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. Clerk server/client keys (as needed)
5. `STRIPE_CONNECTIONS_ENCRYPTION_KEY` (last, with controlled re-encryption)

## 1) Pre-rotation preparation
1. Create a maintenance ticket with owner, start/end window, and rollback owner.
2. Freeze non-critical deploys during the window.
3. Confirm access to:
- Stripe Dashboard
- Supabase Dashboard
- Clerk Dashboard
- Production deploy platform
4. Capture current references (do not copy secret values into tickets):
- Last 4 chars / key identifiers
- Active webhook endpoint IDs
- Deploy ID running in production

## 2) Rotate Stripe API secret (`STRIPE_SECRET_KEY`)
1. In Stripe Dashboard, create a restricted replacement key with least privilege required by billing + webhook sync flows.
2. Set new value in Supabase project secrets as `STRIPE_SECRET_KEY`.
3. Redeploy all billing-related edge functions:
- `create-checkout`
- `customer-portal`
- `check-subscription`
- `stripe-webhook`
- `connect-stripe-revenue`
- `stripe-revenue-status`
- `sync-stripe-revenue`
- `disconnect-stripe-revenue`
4. Run smoke checks:
- Checkout session creation
- Customer portal open
- Subscription status sync
5. Validate logs:
- no `Authentication error` in billing functions
- no `Invalid API Key provided` from Stripe SDK
6. Revoke old Stripe secret key in Stripe Dashboard.

## 3) Rotate Stripe webhook signing secret (`STRIPE_WEBHOOK_SECRET`)
1. In Stripe webhook endpoint settings, rotate signing secret.
2. Update Supabase secret `STRIPE_WEBHOOK_SECRET`.
3. Redeploy `stripe-webhook`.
4. Trigger test events from Stripe:
- `checkout.session.completed`
- `customer.subscription.updated`
5. Confirm `stripe-webhook` logs show successful signature verification.
6. Confirm duplicate idempotency guard still works (`duplicate: true` for replayed event id).

## 4) Rotate Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`)
1. Rotate service role key in Supabase Dashboard.
2. Update project secret `SUPABASE_SERVICE_ROLE_KEY` in runtime.
3. Redeploy all functions that use admin writes.
4. Validate:
- webhook updates subscription rows
- stripe revenue connect/sync/disconnect still work
- rate-limit RPC checks still pass (no `check_rate_limit` permission errors)

## 5) Rotate Clerk secrets
1. Rotate `CLERK_SECRET_KEY` in Clerk.
2. Update runtime secret where server-side Clerk operations execute.
3. If publishable key rotation is required:
- update `VITE_CLERK_PUBLISHABLE_KEY`
- deploy frontend
4. Validate auth flow end-to-end:
- login
- password reset
- Clerk -> Supabase session bridge

## 6) Rotate Stripe connections encryption key (`STRIPE_CONNECTIONS_ENCRYPTION_KEY`)
1. Generate a new base64-encoded 32-byte key.
2. Deploy with dual-read strategy (current implementation supports encrypted primary; legacy plaintext fallback during migration).
3. Re-encrypt stored connection secrets by running:
- `bash scripts/backfill-stripe-secrets.sh --dry-run`
- `bash scripts/backfill-stripe-secrets.sh --apply`
4. After all records are re-encrypted with the new key, remove old key material.

## 7) Post-rotation verification
Run mandatory checks:
1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. Manual production checks:
- signup/login/logout
- checkout success redirect
- billing portal access
- webhook event processing
- paywall enforcement after trial expiry

Run production preflight against deployed environment:
1. Export release env vars (`APP_ENV=production`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
2. Run `npm run supabase:secrets:check`.
3. Run `npm run release:preflight`.
4. Run `npm run smoke:staging`.
5. Confirm all required functions/tables report `[OK]` and no `[FAIL]` entries.

## 8) Rollback
If any critical flow fails:
1. Restore previous secret version in dashboard.
2. Redeploy affected functions/app.
3. Validate minimum recovery checks (auth + checkout + webhook).
4. Open incident report with root cause and follow-up actions.
