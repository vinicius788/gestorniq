#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required (https://supabase.com/docs/guides/cli)." >&2
  exit 2
fi

project_ref="$(resolve_supabase_project_ref || true)"
if [[ -z "${project_ref}" ]]; then
  echo "Unable to resolve SUPABASE project ref. Set SUPABASE_PROJECT_REF, SUPABASE_URL, or supabase/config.toml project_id." >&2
  exit 1
fi

link_cmd=(supabase link --project-ref "${project_ref}")
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  link_cmd+=(--password "${SUPABASE_DB_PASSWORD}")
fi

echo "[INFO] Linking Supabase CLI to project: ${project_ref}"
"${link_cmd[@]}"

db_push_cmd=(supabase db push --linked --include-all)
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  db_push_cmd+=(--password "${SUPABASE_DB_PASSWORD}")
fi

echo "[INFO] Pushing pending migrations to project: ${project_ref}"
"${db_push_cmd[@]}"

echo "[OK] Supabase migrations applied."
