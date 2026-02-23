#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

timestamp_utc="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
evidence_file="${SMOKE_EVIDENCE_FILE:-staging-smoke-evidence.txt}"

status_ok=true

log() {
  printf '%s\n' "$1" | tee -a "${evidence_file}"
}

check_cmd() {
  local title="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    log "[OK] ${title}"
  else
    log "[FAIL] ${title}"
    status_ok=false
  fi
}

check_function_non_404() {
  local function_name="$1"
  local endpoint="${SUPABASE_URL%/}/functions/v1/${function_name}"
  local response_file
  response_file="$(mktemp)"

  local http_code
  http_code="$(
    curl -sS -o "${response_file}" -w "%{http_code}" \
      -X GET \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      "${endpoint}" || printf '000'
  )"

  if [[ "${http_code}" == "404" ]] || grep -q '"code":"NOT_FOUND"' "${response_file}"; then
    log "[FAIL] Function ${function_name} returned 404/NOT_FOUND (${http_code})"
    status_ok=false
  elif [[ "${http_code}" == "000" ]]; then
    log "[FAIL] Function ${function_name} unreachable"
    status_ok=false
  else
    log "[OK] Function ${function_name} reachable (HTTP ${http_code})"
  fi

  rm -f "${response_file}"
}

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" || -z "${APP_URL:-}" ]]; then
  echo "SUPABASE_URL, SUPABASE_ANON_KEY, and APP_URL must be exported before running smoke checks." >&2
  exit 1
fi

: > "${evidence_file}"
log "# STAGING SMOKE EVIDENCE"
log "Timestamp (UTC): ${timestamp_utc}"
log "Runtime target: APP_ENV=production"
log

log "## Automated preflight"
if APP_ENV=production HEALTHCHECK_STRICT=1 bash "${SCRIPT_DIR}/healthcheck.sh" >>"${evidence_file}" 2>&1; then
  log "[OK] release preflight strict passed"
else
  log "[FAIL] release preflight strict failed"
  status_ok=false
fi
log

log "## Function reachability (non-404)"
for function_name in "${REQUIRED_EDGE_FUNCTIONS[@]}"; do
  check_function_non_404 "${function_name}"
done
log

log "## Auth/readiness endpoints"
check_cmd \
  "Supabase Auth health endpoint" \
  curl -fsS "${SUPABASE_URL%/}/auth/v1/health"
check_cmd \
  "Supabase Auth settings endpoint" \
  curl -fsS -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL%/}/auth/v1/settings"
check_cmd \
  "Public app URL reachable" \
  curl -fsS "${APP_URL%/}"
log

log "## Manual smoke steps (10 minutes)"
log "- [ ] Signup -> login -> logout works (evidence: screenshot + timestamp)"
log "- [ ] Workspace/company created once (no duplicate company rows) (evidence: DB query output)"
log "- [ ] Onboarding 'Use Demo Mode' persists after refresh (evidence: screenshot + companies.onboarding_completed=true)"
log "- [ ] Checkout opens Stripe and returns to /dashboard/billing?checkout=success (evidence: checkout session ID)"
log "- [ ] Stripe webhook events processed without signature errors (evidence: event IDs + logs)"
log "- [ ] Customer portal opens and returns to billing page (evidence: portal session URL + screenshot)"
log "- [ ] Expired trial + free plan user denied premium snapshot reads (evidence: response status/body)"
log "- [ ] sync-stripe-revenue denied (403) when user has no active access (evidence: response payload)"
log "- [ ] connect/sync/disconnect Stripe revenue flow completes for paid user (evidence: audit logs + snapshot row)"
log "- [ ] check-subscription is rate-limited on abuse path (evidence: 429 response sample)"
log

log "## Evidence attachments"
log "- Build SHA:"
log "- Supabase project ref:"
log "- Stripe webhook endpoint ID:"
log "- Log links/screenshots:"

if [[ "${status_ok}" != true ]]; then
  echo "Smoke staging checks failed. See ${evidence_file}." >&2
  exit 1
fi

echo "Smoke staging checks passed. Evidence written to ${evidence_file}."
