#!/usr/bin/env bash
set -euo pipefail

# Operational preflight healthcheck.
# In staging/production/release mode this script fails hard on missing env,
# missing required edge functions, and missing required tables.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

status_ok=true

runtime_env="$(get_runtime_env)"
strict_mode=false
app_url_defaulted=false

if is_release_env; then
  strict_mode=true
fi

if [[ "${HEALTHCHECK_STRICT:-}" == "1" || "${HEALTHCHECK_STRICT:-}" == "true" ]]; then
  strict_mode=true
fi

is_ci_runtime() {
  [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]
}

check_command() {
  local name="$1"
  local cmd="$2"

  if eval "$cmd"; then
    echo "[OK] $name"
  else
    echo "[FAIL] $name"
    status_ok=false
  fi
}

report_missing() {
  local message="$1"

  if [[ "$strict_mode" == true ]]; then
    echo "[FAIL] $message"
    status_ok=false
  else
    echo "[WARN] $message"
  fi
}

is_http_code_success() {
  local code="$1"
  [[ "$code" =~ ^2[0-9][0-9]$ || "$code" =~ ^3[0-9][0-9]$ ]]
}

check_edge_function_reachable() {
  local function_name="$1"
  local endpoint="${SUPABASE_URL%/}/functions/v1/${function_name}"
  local output_file
  output_file="$(mktemp)"

  local http_code
  http_code="$(
    curl -sS -o "$output_file" -w "%{http_code}" \
      -X GET \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      "$endpoint" || printf '000'
  )"

  if [[ "$http_code" == "404" ]] || grep -q '"code":"NOT_FOUND"' "$output_file"; then
    report_missing "Edge Function ${function_name} not reachable at ${endpoint} (HTTP ${http_code})"
    rm -f "$output_file"
    return
  fi

  if [[ "$http_code" == "000" ]]; then
    report_missing "Edge Function ${function_name} could not be reached at ${endpoint}"
    rm -f "$output_file"
    return
  fi

  echo "[OK] Edge Function ${function_name} reachable (HTTP ${http_code})"
  rm -f "$output_file"
}

check_table_exists() {
  local table_name="$1"
  local endpoint="${SUPABASE_URL%/}/rest/v1/${table_name}?select=id&limit=1"
  local auth_token="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_ANON_KEY}"
  local output_file
  output_file="$(mktemp)"

  local http_code
  http_code="$(
    curl -sS -o "$output_file" -w "%{http_code}" \
      -X GET \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${auth_token}" \
      "$endpoint" || printf '000'
  )"

  if [[ "$http_code" == "404" ]] || grep -q 'PGRST205' "$output_file"; then
    report_missing "Table ${table_name} missing from Supabase REST schema (HTTP ${http_code})"
    rm -f "$output_file"
    return
  fi

  if [[ "$http_code" == "000" ]]; then
    report_missing "Table check failed for ${table_name}; endpoint unreachable"
    rm -f "$output_file"
    return
  fi

  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    echo "[OK] Table ${table_name} exists (permission denied as expected with current key, HTTP ${http_code})"
    rm -f "$output_file"
    return
  fi

  if is_http_code_success "$http_code"; then
    echo "[OK] Table ${table_name} exists (HTTP ${http_code})"
  else
    report_missing "Unexpected HTTP ${http_code} while checking table ${table_name}"
  fi

  rm -f "$output_file"
}

echo "[INFO] Runtime environment: ${runtime_env}"
if [[ "$strict_mode" == true ]]; then
  echo "[INFO] Strict mode enabled (release/staging guardrails are enforced)."
else
  echo "[INFO] Non-release mode: missing services are warnings (set HEALTHCHECK_STRICT=1 to force)."
fi

if [[ -z "${APP_URL:-}" ]]; then
  if [[ "${strict_mode}" == true ]]; then
    report_missing "APP_URL is required in release mode and should be set for smoke checks"
  else
    APP_URL="http://localhost:3000"
    export APP_URL
    app_url_defaulted=true
    echo "[INFO] APP_URL not set; using safe non-production default (${APP_URL})."
    if is_ci_runtime; then
      echo "[INFO] CI runtime detected; APP_URL default keeps local/CI checks deterministic."
    fi
  fi
fi

if [[ -n "${APP_URL:-}" ]]; then
  if [[ "${app_url_defaulted}" == true ]]; then
    echo "[OK] App URL defaulted for non-release checks (${APP_URL})"
  else
    check_command "App URL reachable" "curl -fsS '${APP_URL}' >/dev/null"
  fi
fi

if [[ -z "${SUPABASE_URL:-}" ]]; then
  report_missing "SUPABASE_URL is required for Supabase preflight checks"
else
  if [[ -n "${SUPABASE_ANON_KEY:-}" ]]; then
    check_command "Supabase REST base reachable" "curl -fsS -H 'apikey: ${SUPABASE_ANON_KEY}' '${SUPABASE_URL%/}/rest/v1/' >/dev/null"
  else
    report_missing "SUPABASE_ANON_KEY is required for function/table reachability checks"
  fi
fi

if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_ANON_KEY:-}" ]]; then
  for function_name in "${REQUIRED_EDGE_FUNCTIONS[@]}"; do
    check_edge_function_reachable "$function_name"
  done

  for table_name in "${REQUIRED_TABLES[@]}"; do
    check_table_exists "$table_name"
  done
else
  report_missing "Skipping required function/table checks because SUPABASE_URL or SUPABASE_ANON_KEY is missing"
fi

if [[ "$status_ok" != true ]]; then
  echo "Healthcheck failed"
  exit 1
fi

echo "Healthcheck completed"
