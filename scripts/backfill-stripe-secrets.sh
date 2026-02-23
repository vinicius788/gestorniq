#!/usr/bin/env bash
set -euo pipefail

dry_run=true
limit=200

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      dry_run=false
      shift
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    --limit)
      if [[ $# -lt 2 ]]; then
        echo "--limit requires a numeric value." >&2
        exit 2
      fi
      limit="$2"
      shift 2
      ;;
    *)
      echo "Usage: bash scripts/backfill-stripe-secrets.sh [--dry-run|--apply] [--limit N]" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required." >&2
  exit 1
fi

endpoint="${SUPABASE_URL%/}/functions/v1/backfill-stripe-secrets"
payload="$(printf '{"dry_run":%s,"limit":%s}' "${dry_run}" "${limit}")"

echo "[INFO] Calling ${endpoint}"
echo "[INFO] dry_run=${dry_run} limit=${limit}"

response_file="$(mktemp)"
http_code="$(
  curl -sS -o "${response_file}" -w "%{http_code}" \
    -X POST "${endpoint}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "${payload}"
)"

cat "${response_file}"
echo

if [[ ! "${http_code}" =~ ^2[0-9][0-9]$ ]]; then
  rm -f "${response_file}"
  echo "[FAIL] backfill-stripe-secrets returned HTTP ${http_code}" >&2
  exit 1
fi

rm -f "${response_file}"
echo "[OK] backfill-stripe-secrets completed (HTTP ${http_code})."
