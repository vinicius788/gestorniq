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
echo "[INFO] Deploying Supabase functions to project: ${project_ref}"

deploy_function() {
  local function_name="$1"
  local function_dir="supabase/functions/${function_name}"

  if [[ ! -d "${function_dir}" ]]; then
    echo "[FAIL] Missing function directory: ${function_dir}" >&2
    return 1
  fi

  echo "[DEPLOY] ${function_name}"
  supabase functions deploy "${function_name}" --project-ref "${project_ref}"
}

for function_name in "${REQUIRED_EDGE_FUNCTIONS[@]}"; do
  deploy_function "${function_name}"
done

if [[ "${DEPLOY_ADMIN_FUNCTIONS:-0}" == "1" || "${DEPLOY_ADMIN_FUNCTIONS:-false}" == "true" ]]; then
  for function_name in "${ADMIN_EDGE_FUNCTIONS[@]}"; do
    deploy_function "${function_name}"
  done
fi

if [[ "$strict_mode" == true ]]; then
  echo "[OK] Release-mode function deployment completed."
else
  echo "[OK] Function deployment completed."
fi
