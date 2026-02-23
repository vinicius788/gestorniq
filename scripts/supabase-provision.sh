#!/usr/bin/env bash
set -euo pipefail

echo "[STEP 1/3] Applying Supabase database migrations"
npm run supabase:db:push

echo "[STEP 2/3] Deploying required Supabase edge functions"
npm run supabase:deploy

echo "[STEP 3/3] Running Supabase healthcheck"
npm run ops:healthcheck

echo "[OK] supabase:provision completed."
