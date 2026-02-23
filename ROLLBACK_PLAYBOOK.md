# Rollback Playbook

Use this playbook when a production deployment introduces a severe regression in auth, billing, data integrity, or app availability.

## 1) Trigger criteria
Start rollback immediately for any of the following:
- checkout/session creation failing for valid users
- webhook processing failing with persistent 5xx
- auth bridge failure (Clerk -> Supabase session not established)
- paywall enforcement allowing unauthorized access or blocking paid users
- repeated unhandled 5xx errors across critical edge functions

## 2) Ownership
- Incident commander: engineering on-call
- Execution owner: release owner
- Communications owner: product owner

## 3) Rollback steps
1. Freeze ongoing deploys.
2. Roll back frontend to the previous known-good deployment.
3. Roll back edge functions to the previous versions:
- `create-checkout`
- `customer-portal`
- `check-subscription`
- `stripe-webhook`
- `connect-stripe-revenue`
- `stripe-revenue-status`
- `sync-stripe-revenue`
- `disconnect-stripe-revenue`
4. Confirm required secrets are still present and not rotated to incompatible values.
5. Validate core paths:
- login/logout
- billing checkout creation
- webhook receipt and subscription sync
- dashboard data reads (RLS still enforced)

## 4) Data and migration policy
- Never manually delete production data during rollback.
- For schema changes, use forward fixes by default.
- Only apply rollback SQL if the migration explicitly supports safe reversal.

## 5) Verification checklist
- Error rate returns to baseline.
- Checkout and portal links open correctly.
- Trial-expired users remain blocked from paid data.
- Paid users can read/write metrics.

## 6) Post-rollback actions
1. Open a postmortem with root cause and timeline.
2. Add automated regression coverage for the failed path.
3. Update `GO_LIVE_CHECKLIST.md` with new prevention checks.
