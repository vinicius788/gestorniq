#!/usr/bin/env bash
# Shared release/staging requirements.
# Source this file from deployment and validation scripts to keep one source of truth.

REQUIRED_EDGE_FUNCTIONS=(
  "create-checkout"
  "customer-portal"
  "check-subscription"
  "stripe-webhook"
  "connect-stripe-revenue"
  "stripe-revenue-status"
  "sync-stripe-revenue"
  "disconnect-stripe-revenue"
)

ADMIN_EDGE_FUNCTIONS=(
  "backfill-stripe-secrets"
)

REQUIRED_TABLES=(
  "companies"
  "subscriptions"
  "revenue_snapshots"
  "user_metrics"
  "valuation_snapshots"
)

# Required custom Supabase project secrets for release environments.
# Note: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by Supabase runtime.
REQUIRED_CUSTOM_SECRETS=(
  "APP_ENV"
  "APP_URL"
  "CORS_ALLOWED_ORIGINS"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_PRICE_STANDARD_ANNUAL"
  "STRIPE_CONNECTIONS_ENCRYPTION_KEY"
)

OPTIONAL_CUSTOM_SECRETS=(
  "SITE_URL"
  "CORS_ALLOW_ALL_LOCAL"
)

trim_whitespace() {
  local value="${1:-}"
  # Trim leading and trailing ASCII whitespace without external tools.
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

load_env_file_if_present() {
  local env_file="$1"
  [[ -f "${env_file}" ]] || return 0

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"

    if [[ "${line}" =~ ^[[:space:]]*$ || "${line}" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if [[ "${line}" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]]; then
      local key="${BASH_REMATCH[2]}"
      local value="${BASH_REMATCH[3]}"

      # Keep explicit environment (CLI/CI) precedence over .env defaults.
      if [[ -n "${!key+x}" ]]; then
        continue
      fi

      value="$(trim_whitespace "${value}")"

      if [[ "${value}" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "${value}" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      else
        value="${value%%[[:space:]]#*}"
        value="$(trim_whitespace "${value}")"
      fi

      printf -v "${key}" '%s' "${value}"
      export "${key}"
    fi
  done < "${env_file}"
}

load_env_defaults() {
  load_env_file_if_present ".env.local"
  load_env_file_if_present ".env"
}

# Load local defaults once when this script is sourced.
load_env_defaults

get_runtime_env() {
  local runtime_env
  runtime_env="$(printf '%s' "${APP_ENV:-${NODE_ENV:-development}}" | tr '[:upper:]' '[:lower:]')"
  trim_whitespace "${runtime_env}"
}

is_release_env() {
  local runtime_env
  runtime_env="$(get_runtime_env)"

  case "$runtime_env" in
    production|prod|staging|stage|release) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_supabase_project_ref() {
  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    printf '%s\n' "${SUPABASE_PROJECT_REF}"
    return 0
  fi

  if [[ -n "${SUPABASE_URL:-}" ]]; then
    local from_url
    from_url="$(
      printf '%s' "${SUPABASE_URL}" \
        | sed -nE 's#^https?://([^.]+)\.supabase\.co(/.*)?$#\1#p'
    )"
    if [[ -n "$from_url" ]]; then
      printf '%s\n' "$from_url"
      return 0
    fi
  fi

  if [[ -f "supabase/config.toml" ]]; then
    local from_config
    from_config="$(
      sed -nE 's/^[[:space:]]*project_id[[:space:]]*=[[:space:]]*"([^"]+)".*$/\1/p' supabase/config.toml \
        | head -n 1
    )"
    if [[ -n "$from_config" ]]; then
      printf '%s\n' "$from_config"
      return 0
    fi
  fi

  return 1
}

resolve_linked_supabase_project_ref() {
  if [[ -f "supabase/.temp/project-ref" ]]; then
    tr -d '\r\n[:space:]' < "supabase/.temp/project-ref"
    return 0
  fi

  return 1
}

print_list() {
  local title="$1"
  shift
  local values=("$@")

  printf '%s\n' "$title"
  for value in "${values[@]}"; do
    printf '  - %s\n' "$value"
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  case "${1:-summary}" in
    functions)
      print_list "Required edge functions:" "${REQUIRED_EDGE_FUNCTIONS[@]}"
      ;;
    admin-functions)
      print_list "Admin edge functions:" "${ADMIN_EDGE_FUNCTIONS[@]}"
      ;;
    tables)
      print_list "Required tables:" "${REQUIRED_TABLES[@]}"
      ;;
    secrets)
      print_list "Required custom secrets:" "${REQUIRED_CUSTOM_SECRETS[@]}"
      ;;
    summary)
      print_list "Required edge functions:" "${REQUIRED_EDGE_FUNCTIONS[@]}"
      echo
      print_list "Admin edge functions:" "${ADMIN_EDGE_FUNCTIONS[@]}"
      echo
      print_list "Required tables:" "${REQUIRED_TABLES[@]}"
      echo
      print_list "Required custom secrets:" "${REQUIRED_CUSTOM_SECRETS[@]}"
      ;;
    *)
      echo "Usage: bash scripts/release-resources.sh [summary|functions|admin-functions|tables|secrets]" >&2
      exit 2
      ;;
  esac
fi
