# GestorNiq Go-Live Checklist

Use this checklist for staging/prod promotion. Paste all outputs into `RELEASE_EVIDENCE.md`.

## 0) Session metadata
- [ ] Release owner:
- [ ] Date/time (UTC):
- [ ] Target environment (`staging` or `production`):
- [ ] Git commit SHA:
- [ ] Supabase project ref:

Evidence:
- [ ] `RELEASE_EVIDENCE.md` updated in this branch.

## 1) Required resources (single source of truth)
Source of truth file: `scripts/release-resources.sh`.

Run:
```bash
bash scripts/release-resources.sh summary
```

Expected required edge functions:
- `create-checkout`
- `customer-portal`
- `check-subscription`
- `stripe-webhook`
- `connect-stripe-revenue`
- `stripe-revenue-status`
- `sync-stripe-revenue`
- `disconnect-stripe-revenue`

Expected required tables:
- `companies`
- `subscriptions`
- `revenue_snapshots`
- `user_metrics`
- `valuation_snapshots`

Evidence:
- [ ] Command output pasted in `RELEASE_EVIDENCE.md`.

## 2) Supabase secrets and deploy
One-command runner:
```bash
npm run release:staging
```

Or run each step manually:
Run:
```bash
npm run supabase:secrets:check
npm run supabase:deploy
APP_ENV=production npm run release:preflight
```

If needed, include admin migration helper deploy:
```bash
DEPLOY_ADMIN_FUNCTIONS=1 npm run supabase:deploy
```

Evidence:
- [ ] `supabase:secrets:check` output pasted.
- [ ] `supabase:deploy` output pasted (function names + deploy IDs/logs).
- [ ] `release:preflight` output pasted (no `[FAIL]` entries).
- [ ] Screenshot of Supabase Functions dashboard showing deployed timestamps.

## 3) Database and migration validation
Run:
```bash
# after linking project
supabase db push
```

Validate:
- [ ] Migration `20260222143000_phase_d_security_and_subscription_indexes.sql` applied.
- [ ] Migration `20260223120000_phase_e_stripe_secret_plaintext_guard.sql` applied.
- [ ] `write_audit_log` not executable by `authenticated`.
- [ ] `subscriptions` indexes exist for `stripe_customer_id` and `stripe_subscription_id`.
- [ ] Plaintext guard trigger exists on `stripe_connections`.
- [ ] Staging restore drill executed (no guaranteed down migration for `20260220100000_phase_a_launch_blockers.sql`; rollback strategy is restore).

Evidence:
- [ ] `supabase db push` output pasted.
- [ ] SQL verification output pasted (`\df+ write_audit_log`, index list, trigger list).
- [ ] Restore drill evidence attached (RTO/RPO + restore point timestamp).

## 4) Stripe configuration
Validate:
- [ ] Webhook endpoint URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- [ ] Events enabled:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] `STRIPE_PRICE_STANDARD_ANNUAL` points to expected staging/prod price.

Evidence:
- [ ] Stripe webhook endpoint ID:
- [ ] Stripe webhook screenshot:
- [ ] Test event IDs and outcomes pasted.

## 5) CORS and domain allowlist
Required config:
- [ ] `CORS_ALLOWED_ORIGINS` includes exact production and staging domains.
- [ ] Vercel previews are either disabled or explicitly constrained with wildcard in staging only (for example `https://*.vercel.app`).
- [ ] `CORS_ALLOW_ALL_LOCAL` is not enabled in production.

Evidence:
- [ ] Secret values/redacted config screenshot.
- [ ] Preflight curl output for allowed origin and blocked origin pasted.

## 6) Staging smoke run
Run:
```bash
APP_ENV=production npm run smoke:staging
```

Evidence:
- [ ] `staging-smoke-evidence.txt` content pasted in `RELEASE_EVIDENCE.md`.
- [ ] Manual smoke checklist completed with screenshots and IDs:
  - [ ] signup/login/logout
  - [ ] company creation (single workspace)
  - [ ] demo mode persists after refresh
  - [ ] checkout success return
  - [ ] webhook processing
  - [ ] customer portal return
  - [ ] expired trial denied
  - [ ] `sync-stripe-revenue` denied without active access

## 7) CI + dependency gates
Run:
```bash
npm run ci:check
npm audit --omit=dev --audit-level=high
```

Validate:
- [ ] CI green.
- [ ] No high/critical audit findings.
- [ ] Moderate findings triaged and documented in evidence.

Evidence:
- [ ] CI run URL:
- [ ] Audit output pasted.

## 8) Final sign-off
- [ ] Engineering sign-off:
- [ ] Product sign-off:
- [ ] Security sign-off:
- [ ] Go/No-Go decision:

Evidence:
- [ ] Final decision recorded in `RELEASE_EVIDENCE.md`.
