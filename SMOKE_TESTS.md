# Launch Smoke Tests

Run these checks in a production-like environment after deploy.

## Preconditions
- Production secrets set (including `APP_URL`, Stripe secrets, Supabase service role key, Clerk keys).
- Latest migrations applied.
- Stripe webhook endpoint active.

## 1) Signup / Login / Logout
1. Create a new account.
2. Log in and verify redirect to dashboard.
3. Log out and verify protected routes redirect to `/auth`.
Expected: No auth errors in UI or edge logs.

## 2) Onboarding creates a single company
1. Complete onboarding once.
2. Verify one row in `companies` for user (`UNIQUE(user_id)` enforced).
3. Try re-triggering company creation flow.
Expected: no second company is created, no trial reset.

## 3) Trial active then blocked on expiry
1. Confirm trial user can read/write snapshots.
2. Simulate trial expiry (`trials.ends_at` in past + status `expired`).
3. Retry dashboard data read/write.
Expected: backend returns access denied via RLS; UI routes to billing.

## 4) Checkout and success redirect
1. Start checkout from billing page.
2. Complete payment in Stripe test mode.
3. Confirm redirect to `/dashboard/billing?checkout=success`.
Expected: visible success confirmation banner and subscription sync follows.

## 5) Webhook signature validation
1. Send webhook test event with valid signature.
2. Send request with invalid/missing signature.
Expected: valid request processes; invalid request returns 400.

## 6) Stripe revenue sync path
1. Connect Stripe revenue source in settings.
2. Invoke `sync-stripe-revenue`.
3. Verify snapshots inserted/updated (`source='stripe'`).
4. Invoke sync repeatedly quickly.
Expected: normal call succeeds; abusive repetition returns 429.

## 7) CSV import/export happy path
1. Import valid CSV for revenue and user growth.
2. Export Investor Pack CSV.
Expected: records imported successfully and export file downloads with expected rows.

## 8) Backend paywall enforcement
1. Use expired trial + no paid subscription user.
2. Call Supabase API directly for `revenue_snapshots`, `user_metrics`, `valuation_snapshots`.
Expected: read/write denied by RLS (`has_active_access` guard).

## Evidence to capture
- Screenshots of UI outcomes.
- Supabase query logs.
- Stripe event IDs.
- Function logs with request IDs.
