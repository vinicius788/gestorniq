#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

drill_env="${DRILL_ENV:-staging}"
evidence_file="${DRILL_EVIDENCE_FILE:-restore-drill-evidence.md}"
yes_mode=false

usage() {
  cat <<'EOF'
Usage: bash scripts/db-restore-drill.sh [--env staging|production] [--evidence-file FILE] [--yes]

This command is non-destructive.
It validates prerequisites and prints the restore drill runbook steps.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      if [[ $# -lt 2 ]]; then
        echo "--env requires a value (staging|production)." >&2
        exit 2
      fi
      drill_env="$2"
      shift 2
      ;;
    --evidence-file)
      if [[ $# -lt 2 ]]; then
        echo "--evidence-file requires a file path." >&2
        exit 2
      fi
      evidence_file="$2"
      shift 2
      ;;
    --yes)
      yes_mode=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required (https://supabase.com/docs/guides/cli)." >&2
  exit 2
fi

case "${drill_env}" in
  staging|production) ;;
  *)
    echo "Invalid --env value '${drill_env}'. Use staging or production." >&2
    exit 2
    ;;
esac

project_ref="$(resolve_supabase_project_ref || true)"
if [[ -z "${project_ref}" ]]; then
  echo "[FAIL] Unable to resolve Supabase project ref." >&2
  echo "[HINT] Set SUPABASE_PROJECT_REF or SUPABASE_URL, or add project_id in supabase/config.toml." >&2
  exit 1
fi

linked_project_ref="$(resolve_linked_supabase_project_ref || true)"
if [[ -z "${linked_project_ref}" ]]; then
  echo "[WARN] This workspace is not linked to a Supabase project."
  echo "[HINT] Run: supabase link --project-ref ${project_ref}"
elif [[ "${linked_project_ref}" != "${project_ref}" ]]; then
  echo "[WARN] Linked project ref (${linked_project_ref}) differs from target (${project_ref})."
  echo "[HINT] Run: supabase link --project-ref ${project_ref}"
fi

if [[ "${drill_env}" == "production" && "${yes_mode}" != "true" ]]; then
  echo "[WARN] Production restore drills should run against a clone/sandbox whenever possible."
  echo "[HINT] Re-run with --yes after explicit change window approval."
  exit 1
fi

timestamp_utc="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "${evidence_file}" <<EOF
# Restore Drill Evidence

- Timestamp (UTC): ${timestamp_utc}
- Drill environment: ${drill_env}
- Supabase project ref: ${project_ref}
- Release SHA under test: \`5330f16f6281f58284789800e7ba68959803ab6b\`

## 1) Baseline before migration
- [ ] Row counts captured for: companies, subscriptions, revenue_snapshots, user_metrics, valuation_snapshots
- [ ] Current migration version captured (\`supabase migration list --linked\`)
- [ ] Backup/PITR reference (backup ID or recovery timestamp) recorded

## 2) Migration + restore execution
- [ ] Pre-migration backup/snapshot confirmed in Supabase dashboard
- [ ] Migration applied (\`npm run supabase:db:push\`)
- [ ] Restore executed (PITR/snapshot) to pre-migration timestamp in drill target

## 3) Post-restore integrity checks
- [ ] Core table counts match baseline (or approved delta explained)
- [ ] \`has_function_privilege('authenticated', 'public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID)', 'EXECUTE') = false\`
- [ ] \`subscriptions_stripe_customer_id_idx\` and \`subscriptions_stripe_subscription_id_idx\` exist
- [ ] Trigger \`on_stripe_connections_guard_secret_storage\` exists

## 4) RTO/RPO
- [ ] Restore start/end timestamps captured
- [ ] RTO (minutes): _____
- [ ] RPO (minutes/data loss window): _____

## 5) Evidence links
- [ ] Dashboard screenshots
- [ ] SQL output logs
- [ ] Incident timeline notes
EOF

echo "[INFO] Created evidence scaffold: ${evidence_file}"
echo
echo "[INFO] Staging Restore Drill steps (non-destructive output):"
cat <<'EOF'
1) Confirm change window + owner + rollback approver.
2) Record baseline:
   - supabase migration list --linked
   - table row counts for core tables
3) In Supabase dashboard, verify backup/PITR point immediately before migration.
4) Apply migrations in drill target:
   - npm run supabase:db:push
5) Simulate rollback by restoring to the pre-migration point (PITR/snapshot).
6) Validate integrity checks and capture outputs in the evidence file.
7) Compute and record RTO/RPO.
8) Attach evidence to RELEASE_EVIDENCE.md before GO decision.

IMPORTANT:
- Migration 20260220100000_phase_a_launch_blockers.sql includes consolidation/deletes.
- There is no guaranteed down migration for that path; rollback strategy is restore.
EOF

echo
echo "[OK] Drill plan generated. No destructive action was executed."
