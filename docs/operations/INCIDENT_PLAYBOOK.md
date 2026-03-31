# Incident Playbook

Operational guide for production incidents in GestorNiq.

## Severity levels
- Sev 1: complete outage, billing unavailable, auth failure, or data exposure risk
- Sev 2: major degraded behavior in critical flows (dashboard load, webhook processing, paywall)
- Sev 3: non-critical degraded experience

## 1) First 15 minutes
1. Acknowledge the incident and assign an incident commander.
2. Identify blast radius:
- auth
- billing
- webhook
- dashboard data access
3. Capture initial evidence:
- deploy ID
- failing endpoint(s)
- error logs and timestamps

## 2) Triage checklist
- Confirm Supabase status and API availability.
- Check edge function logs for 401/403/429/5xx spikes.
- Validate Stripe webhook signature verification path.
- Validate Clerk/Supabase auth bridge token flow.
- Confirm RLS behavior on core tables (`companies`, `revenue_snapshots`, `user_metrics`, `valuation_snapshots`).

## 3) Mitigation options
- Rollback app/functions using `ROLLBACK_PLAYBOOK.md`.
- Temporarily disable non-critical feature paths causing cascading failures.
- Increase alerting and enable additional request tracing logs.

## 4) Communication
- Update internal stakeholders every 30 minutes during active incident.
- Log key actions and decisions in timeline format.

## 5) Closure criteria
- No critical error spikes for 30+ minutes.
- Core smoke checks pass.
- Follow-up ticket list created and prioritized.

## 6) Post-incident
- Publish postmortem with:
- root cause
- impact window
- corrective actions
- prevention actions and owners
