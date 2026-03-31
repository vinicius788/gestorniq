#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

clerk_key="${VITE_CLERK_PUBLISHABLE_KEY:-${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}}"
template_name="${VITE_CLERK_SUPABASE_JWT_TEMPLATE:-supabase}"
supabase_url="${SUPABASE_URL:-${VITE_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
supabase_anon_key="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}}}}}"
supabase_service_key="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-}}"

if [[ -z "${clerk_key}" ]]; then
  echo "[INFO] Clerk publishable key not configured. Skipping Clerk -> Supabase bridge check."
  exit 0
fi

if [[ -z "${supabase_url}" || -z "${supabase_anon_key}" ]]; then
  echo "[FAIL] Supabase URL/key missing. Set SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY/PUBLISHABLE_KEY)."
  exit 1
fi

trim_value() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

print_project_access_snapshot() {
  if ! command -v supabase >/dev/null 2>&1; then
    return 0
  fi

  local env_ref
  env_ref="$(
    printf '%s' "${supabase_url%/}" \
      | sed -nE 's#^https?://([^.]+)\.supabase\.co$#\1#p'
  )"

  if [[ -z "${env_ref}" ]]; then
    return 0
  fi

  local list_json
  if ! list_json="$(supabase projects list --output json 2>/dev/null)"; then
    return 0
  fi

  local known_refs
  known_refs="$(
    node -e '
      const raw = process.argv[1];
      try {
        const parsed = JSON.parse(raw);
        const refs = Array.isArray(parsed)
          ? parsed
              .map((entry) => entry?.id)
              .filter((id) => typeof id === "string" && id.length > 0)
          : [];
        process.stdout.write(refs.join(","));
      } catch {
        process.stdout.write("");
      }
    ' "${list_json}" 2>/dev/null || true
  )"

  if [[ -n "${known_refs}" && ",${known_refs}," != *",${env_ref},"* ]]; then
    echo "[WARN] The Supabase project in .env (${env_ref}) is not visible to the current Supabase CLI profile."
    echo "[HINT] You may be validating/configuring a different Supabase project."
  fi
}

print_template_status() {
  if [[ -z "${CLERK_SECRET_KEY:-}" ]]; then
    echo "[WARN] CLERK_SECRET_KEY is missing. Cannot verify Clerk JWT template configuration."
    return 0
  fi

  local response_file
  response_file="$(mktemp)"

  local http_code
  http_code="$(
    curl -sS -o "${response_file}" -w "%{http_code}" \
      -X GET "https://api.clerk.com/v1/jwt_templates" \
      -H "Authorization: Bearer ${CLERK_SECRET_KEY}" || printf "000"
  )"

  if [[ "${http_code}" != "200" ]]; then
    echo "[WARN] Could not fetch Clerk JWT templates (HTTP ${http_code})."
    rm -f "${response_file}"
    return 0
  fi

  local template_status
  template_status="$(
    node -e '
      const fs = require("fs");
      const raw = fs.readFileSync(process.argv[1], "utf8");
      const templates = JSON.parse(raw);
      const target = process.argv[2];
      const match = Array.isArray(templates)
        ? templates.find((item) => item && item.name === target)
        : null;
      if (!match) {
        process.stdout.write(`missing:${target}`);
        process.exit(0);
      }
      const algo = String(match.signing_algorithm || "unknown");
      const customSigningKey = match.custom_signing_key === true ? "custom-key" : "managed-key";
      process.stdout.write(`ok:${target}:${algo}:${customSigningKey}`);
    ' "${response_file}" "${template_name}" 2>/dev/null || true
  )"

  rm -f "${response_file}"

  if [[ "${template_status}" == missing:* ]]; then
    echo "[FAIL] Clerk JWT template '${template_name}' was not found."
    return 1
  fi

  if [[ "${template_status}" == ok:* ]]; then
    IFS=':' read -r _ name algo key_mode <<< "${template_status}"
    echo "[INFO] Clerk JWT template '${name}' found (${algo}, ${key_mode})."

    if [[ "${algo}" != "HS256" || "${key_mode}" != "custom-key" ]]; then
      echo "[FAIL] Clerk JWT template '${name}' must be HS256 with custom signing key (Supabase JWT secret)."
      return 1
    fi

    return 0
  fi

  echo "[WARN] Unable to validate Clerk JWT template metadata."
  return 0
}

resolve_test_token() {
  if [[ -n "${CLERK_BRIDGE_TEST_TOKEN:-}" ]]; then
    printf '%s' "${CLERK_BRIDGE_TEST_TOKEN}"
    return 0
  fi

  if [[ -z "${CLERK_SECRET_KEY:-}" ]]; then
    return 1
  fi

  local user_id="${CLERK_BRIDGE_TEST_USER_ID:-}"

  if [[ -z "${user_id}" ]]; then
    user_id="$(
      curl -sS "https://api.clerk.com/v1/users?limit=1" \
        -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
        | node -e '
            const fs = require("fs");
            const raw = fs.readFileSync(0, "utf8");
            try {
              const parsed = JSON.parse(raw);
              process.stdout.write(Array.isArray(parsed) && parsed[0]?.id ? parsed[0].id : "");
            } catch {
              process.stdout.write("");
            }
          '
    )"
  fi

  if [[ -z "${user_id}" ]]; then
    return 1
  fi

  local session_id
  session_id="$(
    curl -sS "https://api.clerk.com/v1/sessions?user_id=${user_id}&status=active&limit=1" \
      -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
      | node -e '
          const fs = require("fs");
          const raw = fs.readFileSync(0, "utf8");
          try {
            const parsed = JSON.parse(raw);
            process.stdout.write(Array.isArray(parsed) && parsed[0]?.id ? parsed[0].id : "");
          } catch {
            process.stdout.write("");
          }
        '
  )"

  if [[ -z "${session_id}" ]]; then
    return 1
  fi

  local token
  token="$(
    curl -sS -X POST "https://api.clerk.com/v1/sessions/${session_id}/tokens/${template_name}" \
      -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
      -H "Content-Type: application/json" \
      | node -e '
          const fs = require("fs");
          const raw = fs.readFileSync(0, "utf8");
          try {
            const parsed = JSON.parse(raw);
            process.stdout.write(typeof parsed.jwt === "string" ? parsed.jwt : "");
          } catch {
            process.stdout.write("");
          }
        '
  )"

  if [[ -z "${token}" ]]; then
    return 1
  fi

  printf '%s' "${token}"
  return 0
}

validate_clerk_schema_primitives() {
  local token="$1"
  local response_file
  response_file="$(mktemp)"

  local function_http_code
  function_http_code="$(
    curl -sS -o "${response_file}" -w "%{http_code}" \
      -X POST "${supabase_url%/}/rest/v1/rpc/clerk_user_id" \
      -H "apikey: ${supabase_anon_key}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d '{}' || printf "000"
  )"

  local function_body
  function_body="$(cat "${response_file}")"
  rm -f "${response_file}"

  local function_normalized
  function_normalized="$(printf '%s' "${function_body}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${function_http_code}" != "200" && "${function_http_code}" != "204" ]]; then
    echo "[FAIL] Could not execute public.clerk_user_id() via RPC (HTTP ${function_http_code})."
    echo "[INFO] Response: ${function_body}"
    echo "[HINT] Ensure function public.clerk_user_id() exists and is executable by authenticated users."
    return 1
  fi

  if [[ "${function_normalized}" == *"could not find"* || "${function_normalized}" == *"not found"* || "${function_normalized}" == *"pgrst202"* ]]; then
    echo "[FAIL] public.clerk_user_id() function not found in Supabase."
    echo "[HINT] Apply migration 20260305000001_migrate_uuid_to_clerk_id.sql."
    return 1
  fi

  echo "[INFO] public.clerk_user_id() function confirmed."

  local schema_probe_key="${supabase_service_key:-${supabase_anon_key}}"
  if [[ -z "${supabase_service_key}" ]]; then
    echo "[WARN] SUPABASE_SERVICE_ROLE_KEY not set; schema checks may be limited by RLS."
  fi

  local table
  for table in companies profiles subscriptions company_merge_conflicts; do
    response_file="$(mktemp)"

    local table_http_code
    table_http_code="$(
      curl -sS -o "${response_file}" -w "%{http_code}" \
        -X GET "${supabase_url%/}/rest/v1/${table}?select=clerk_user_id&limit=1" \
        -H "apikey: ${supabase_anon_key}" \
        -H "Authorization: Bearer ${schema_probe_key}" || printf "000"
    )"

    local table_body
    table_body="$(cat "${response_file}")"
    rm -f "${response_file}"

    local table_normalized
    table_normalized="$(printf '%s' "${table_body}" | tr '[:upper:]' '[:lower:]')"

    if [[ "${table_normalized}" == *"clerk_user_id does not exist"* || "${table_normalized}" == *"\"code\":\"42703\""* ]]; then
      echo "[FAIL] ${table}.clerk_user_id column not found."
      echo "[HINT] Apply migrations 20260305000001_migrate_uuid_to_clerk_id.sql and 20260307102000_company_merge_conflicts_clerk_user_id.sql."
      return 1
    fi

    if [[ "${table_http_code}" == "401" || "${table_http_code}" == "403" ]]; then
      echo "[WARN] Could not fully verify ${table}.clerk_user_id with current key (HTTP ${table_http_code})."
      continue
    fi

    if [[ "${table_http_code}" == "200" || "${table_http_code}" == "206" ]]; then
      echo "[INFO] ${table}.clerk_user_id column confirmed."
      continue
    fi

    if [[ "${table_http_code}" == "000" ]]; then
      echo "[FAIL] Could not reach Supabase while checking ${table}.clerk_user_id."
      return 1
    fi

    echo "[FAIL] Unexpected response while checking ${table}.clerk_user_id (HTTP ${table_http_code})."
    echo "[INFO] Response: ${table_body}"
    return 1
  done

  return 0
}

probe_supabase_with_token() {
  local token="$1"
  local response_file
  response_file="$(mktemp)"

  local http_code
  http_code="$(
    curl -sS -o "${response_file}" -w "%{http_code}" \
      -X GET "${supabase_url%/}/rest/v1/companies?select=id&limit=1" \
      -H "apikey: ${supabase_anon_key}" \
      -H "Authorization: Bearer ${token}" || printf "000"
  )"

  local body
  body="$(cat "${response_file}")"
  rm -f "${response_file}"

  if [[ "${http_code}" == "200" ]]; then
    echo "[OK] Supabase accepted Clerk JWT bearer auth (HTTP 200)."
    return 0
  fi

  local normalized
  normalized="$(printf '%s' "${body}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${normalized}" == *"bad_jwt"* || "${normalized}" == *"invalid jwt"* || "${normalized}" == *"signature"* ]]; then
    echo "[FAIL] Supabase rejected Clerk JWT signature. Ensure Clerk template uses HS256 with Supabase JWT secret."
    return 1
  fi

  if [[ "${normalized}" == *"authentication required"* || "${http_code}" == "401" || "${http_code}" == "403" ]]; then
    echo "[FAIL] Supabase request was unauthorized with Clerk JWT (HTTP ${http_code})."
    return 1
  fi

  if [[ "${normalized}" == *"invalid input syntax for type uuid"* && "${normalized}" == *"user_"* ]]; then
    echo "[FAIL] Clerk-authenticated probe hit UUID cast error."
    echo "[HINT] Legacy RLS policies/functions likely still reference auth.uid()/user_id UUID path."
    echo "[HINT] Ensure RLS and bootstrap RPCs use public.clerk_user_id()."
    return 1
  fi

  echo "[FAIL] Unexpected Supabase response while validating Clerk JWT (HTTP ${http_code})."
  echo "[INFO] Response: ${body}"
  return 1
}

if ! print_template_status; then
  print_project_access_snapshot
  exit 1
fi

if ! clerk_token="$(resolve_test_token)"; then
  echo "[FAIL] Could not mint a Clerk test JWT."
  echo "[HINT] Provide CLERK_BRIDGE_TEST_TOKEN or ensure CLERK_SECRET_KEY with an active Clerk session exists."
  print_project_access_snapshot
  exit 1
fi

if ! validate_clerk_schema_primitives "${clerk_token}"; then
  print_project_access_snapshot
  exit 1
fi

if probe_supabase_with_token "${clerk_token}"; then
  echo "[OK] Clerk -> Supabase JWT bridge precheck passed."
  exit 0
fi

print_project_access_snapshot
exit 1
