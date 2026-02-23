#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required (https://supabase.com/docs/guides/cli)." >&2
  exit 2
fi

runtime_env="$(get_runtime_env)"
strict_mode=false
if is_release_env; then
  strict_mode=true
fi

project_ref="$(resolve_supabase_project_ref || true)"
if [[ -z "${project_ref}" ]]; then
  echo "Unable to resolve SUPABASE project ref. Set SUPABASE_PROJECT_REF or SUPABASE_URL." >&2
  exit 1
fi

echo "[INFO] Runtime environment: ${runtime_env}"
echo "[INFO] Checking Supabase secrets for project: ${project_ref}"

tmp_output="$(mktemp)"
if ! supabase secrets list --project-ref "${project_ref}" >"${tmp_output}" 2>&1; then
  cat "${tmp_output}" >&2
  rm -f "${tmp_output}"
  echo "[FAIL] Unable to list project secrets." >&2
  exit 1
fi

secret_names="$(
  awk -F'|' '
    NR <= 2 { next }
    {
      name = $1
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name != "" && name !~ /^-+$/) {
        print name
      }
    }
  ' "${tmp_output}"
)"
rm -f "${tmp_output}"

missing=()
for required_secret in "${REQUIRED_CUSTOM_SECRETS[@]}"; do
  if ! printf '%s\n' "${secret_names}" | grep -qx "${required_secret}"; then
    missing+=("${required_secret}")
  fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo "[FAIL] Missing required custom secrets:"
  for name in "${missing[@]}"; do
    echo "  - ${name}"
  done
  exit 1
fi

if [[ -n "${STRIPE_CONNECTIONS_ENCRYPTION_KEY:-}" ]]; then
  key_bytes=""
  normalized_key="$(printf '%s' "${STRIPE_CONNECTIONS_ENCRYPTION_KEY}" | tr '_-' '/+')"

  if printf '%s' "${normalized_key}" | base64 --decode >/dev/null 2>&1; then
    key_bytes="$(
      printf '%s' "${normalized_key}" \
        | base64 --decode 2>/dev/null \
        | wc -c \
        | tr -d ' '
    )"
  elif printf '%s' "${normalized_key}" | base64 -D >/dev/null 2>&1; then
    key_bytes="$(
      printf '%s' "${normalized_key}" \
        | base64 -D 2>/dev/null \
        | wc -c \
        | tr -d ' '
    )"
  else
    echo "[FAIL] Unable to decode STRIPE_CONNECTIONS_ENCRYPTION_KEY locally." >&2
    exit 1
  fi

  if [[ "${key_bytes}" != "32" ]]; then
    echo "[FAIL] STRIPE_CONNECTIONS_ENCRYPTION_KEY must decode to 32 bytes." >&2
    exit 1
  fi
fi

if [[ "${strict_mode}" == true ]]; then
  echo "[OK] All required custom secrets are configured for release mode."
else
  echo "[OK] All required custom secrets are configured."
fi
