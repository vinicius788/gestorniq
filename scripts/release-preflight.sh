#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-resources.sh
source "${SCRIPT_DIR}/release-resources.sh"

echo "[INFO] Running release preflight with strict production guardrails."

APP_ENV=production HEALTHCHECK_STRICT=1 bash "${SCRIPT_DIR}/healthcheck.sh"

echo "[OK] Release preflight completed."
