#!/usr/bin/env bash
set -euo pipefail

HOST="${PREVIEW_HOST:-127.0.0.1}"
PORT="${PREVIEW_PORT:-4173}"
BASE_URL="http://${HOST}:${PORT}"
NODE_RUNNER="${SMOKE_NODE_RUNNER:-node}"
LOG_FILE="$(mktemp -t gestorniq-preview.XXXXXX.log)"
HTML_FILE="$(mktemp -t gestorniq-preview.XXXXXX.html)"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${LOG_FILE}" "${HTML_FILE}"
}

trap cleanup EXIT

echo "[STEP 1/3] Building production bundle"
"${NODE_RUNNER}" ./node_modules/vite/bin/vite.js build >/dev/null

echo "[STEP 2/3] Starting local production preview on ${BASE_URL}"
"${NODE_RUNNER}" ./node_modules/vite/bin/vite.js preview --host "${HOST}" --port "${PORT}" >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "${BASE_URL}" -o "${HTML_FILE}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BASE_URL}" -o "${HTML_FILE}" >/dev/null 2>&1; then
  echo "[ERROR] Preview server did not become ready."
  echo "[INFO] Preview log:"
  cat "${LOG_FILE}"
  exit 1
fi

echo "[STEP 3/3] Verifying generated HTML shell"

grep -q "<title>GestorNiq - VC-Ready SaaS Metrics</title>" "${HTML_FILE}" || {
  echo "[ERROR] Production HTML title did not match the expected release title."
  exit 1
}

grep -q "<div id=\"root\"></div>" "${HTML_FILE}" || {
  echo "[ERROR] Root app container is missing from the production HTML."
  exit 1
}

grep -q "/assets/" "${HTML_FILE}" || {
  echo "[ERROR] Built asset references were not found in the production HTML."
  exit 1
}

echo "[OK] Local production preview smoke test passed at ${BASE_URL}"
