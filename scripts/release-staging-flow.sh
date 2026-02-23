#!/usr/bin/env bash
set -euo pipefail

echo "[STEP 1/5] Checking required Supabase secrets"
npm run supabase:secrets:check

echo "[STEP 2/5] Applying Supabase database migrations"
npm run supabase:db:push

echo "[STEP 3/5] Deploying required Supabase edge functions"
npm run supabase:deploy

echo "[STEP 4/5] Running strict release preflight"
npm run release:preflight

echo "[STEP 5/5] Running staging smoke checks"
npm run smoke:staging

echo "[OK] release:staging flow completed."
