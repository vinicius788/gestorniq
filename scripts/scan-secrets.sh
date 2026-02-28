#!/usr/bin/env bash
set -euo pipefail

# Scan tracked files for high-risk leaked secret patterns.
# Ignores .env* files by design; use SCAN_ENV_POLICY=1 to enforce
# repository policy checks for tracked env files and .gitignore coverage.

RG_PATTERN='(sk_(live|test)_[A-Za-z0-9]{16,}|rk_(live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9]{16,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*["\x27]?[A-Za-z0-9._-]{20,}|CLERK_SECRET_KEY\s*=\s*["\x27]?sk_(live|test)_[A-Za-z0-9]{16,})'
GREP_PATTERN="(sk_(live|test)_[A-Za-z0-9]{16,}|rk_(live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9]{16,}|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[\"']?[A-Za-z0-9._-]{20,}|CLERK_SECRET_KEY[[:space:]]*=[[:space:]]*[\"']?sk_(live|test)_[A-Za-z0-9]{16,})"

list_scan_targets() {
  git ls-files \
    | grep -Ev '(^\.env$|^\.env\.|^node_modules/|^dist/|^bun\.lockb$|^package-lock\.json$)' || true
}

scan_with_rg() {
  local output=""
  local file

  while IFS= read -r file; do
    [[ -n "${file}" ]] || continue
    local match
    match="$(rg --no-heading --line-number --color=never -e "${RG_PATTERN}" "${file}" || true)"
    if [[ -n "${match}" ]]; then
      output+="${match}"$'\n'
    fi
  done < <(list_scan_targets)

  printf '%s' "${output}"
}

scan_with_grep() {
  local output=""
  local file

  while IFS= read -r file; do
    [[ -n "${file}" ]] || continue
    local match
    match="$(grep -nH -E "${GREP_PATTERN}" "${file}" || true)"
    if [[ -n "${match}" ]]; then
      output+="${match}"$'\n'
    fi
  done < <(list_scan_targets)

  printf '%s' "${output}"
}

if command -v rg >/dev/null 2>&1; then
  MATCHES="$(scan_with_rg)"
else
  echo "ripgrep (rg) not found; using grep fallback for secret scan." >&2
  MATCHES="$(scan_with_grep)"
fi

if [[ -n "$MATCHES" ]]; then
  echo "Potential secret exposure found in tracked files:"
  echo "$MATCHES"
  exit 1
fi

if [[ "${SCAN_ENV_POLICY:-0}" == "1" || "${SCAN_ENV_POLICY:-false}" == "true" ]]; then
  if ! grep -Eq '^\.env$' .gitignore; then
    echo "Policy failed: .gitignore must include '.env'"
    exit 1
  fi

  if ! grep -Eq '^\.env\.\*$' .gitignore; then
    echo "Policy failed: .gitignore must include '.env.*'"
    exit 1
  fi

  tracked_env_files=$(
    git ls-files \
      | grep -E '(^|/)\.env($|\.)' \
      | grep -Ev '(^|/)\.env\.example$' || true
  )

  if [[ -n "$tracked_env_files" ]]; then
    echo "Policy failed: tracked env files found (must not be committed):"
    echo "$tracked_env_files"
    exit 1
  fi

  echo "Env policy check passed: .env files are ignored and not tracked."
fi

echo "Secret scan passed: no high-risk patterns found in tracked files (excluding .env* by policy)."
