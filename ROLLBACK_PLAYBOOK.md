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
5. Database rollback policy:
- `20260220100000_phase_a_launch_blockers.sql` performs consolidation and `DELETE` operations.
- There is no guaranteed down migration for that path.
- Database rollback strategy is **restore** (PITR/snapshot), not ad-hoc reverse SQL.
6. Execute restore runbook when DB rollback is required:
- identify pre-deploy restore point timestamp
- restore to a safe target using Supabase PITR/snapshot flow
- run integrity checks (table counts, key indexes, trigger guards)
7. Validate core paths:
- login/logout
- billing checkout creation
- webhook receipt and subscription sync
- dashboard data reads (RLS still enforced)

## 4) Data and migration policy
- Never manually delete production data during rollback.
- For schema changes, use forward fixes by default.
- Only apply rollback SQL if the migration explicitly supports safe reversal.
- If safe reversal is not guaranteed, restore from backup/PITR and document the restore point used.

## 5) Verification checklist
- Error rate returns to baseline.
- Checkout and portal links open correctly.
- Trial-expired users remain blocked from paid data.
- Paid users can read/write metrics.
- Post-restore DB checks pass:
- `write_audit_log` remains non-executable by `authenticated`.
- `subscriptions_stripe_customer_id_idx` and `subscriptions_stripe_subscription_id_idx` exist.
- `on_stripe_connections_guard_secret_storage` trigger exists.

## 6) Post-rollback actions
1. Open a postmortem with root cause and timeline.
2. Add automated regression coverage for the failed path.
3. Update `GO_LIVE_CHECKLIST.md` with new prevention checks.

## 7) Restore drill requirement before GO
- Run the non-destructive drill planner:
```bash
npm run ops:db-restore-drill -- --env staging
```
- Fill the generated evidence file and attach outputs/screenshots to `RELEASE_EVIDENCE.md` before GO.
- Record measured RTO/RPO from the staging restore drill.
