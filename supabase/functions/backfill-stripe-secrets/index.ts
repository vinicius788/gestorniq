import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encryptSecret } from "../_shared/encryption.ts";
import { getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";

interface JwtClaims {
  role?: string;
}

function decodeJwtPayload(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    throw new HttpError(401, "Invalid bearer token format");
  }

  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    return JSON.parse(atob(padded));
  } catch {
    throw new HttpError(401, "Invalid bearer token payload");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("backfill-stripe-secrets", req);

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const token = authHeader.slice(7).trim();
    const claims = decodeJwtPayload(token);
    if (claims.role !== "service_role") {
      throw new HttpError(403, "Service role token required");
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const limitRaw = typeof body?.limit === "number" ? Math.floor(body.limit) : 200;
    const limit = Math.min(1000, Math.max(1, limitRaw));

    const { data: records, error: fetchError } = await supabaseAdmin
      .from("stripe_connections")
      .select("company_id, api_key_secret, api_key_secret_encrypted")
      .not("api_key_secret", "is", null)
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (fetchError) throw new HttpError(500, fetchError.message);

    const candidates = (records ?? []).filter(
      (record) =>
        typeof record.api_key_secret === "string" &&
        record.api_key_secret.length > 0 &&
        !record.api_key_secret_encrypted,
    );

    let updated = 0;
    const failures: Array<{ company_id: string; error: string }> = [];

    for (const candidate of candidates) {
      if (dryRun) {
        updated += 1;
        continue;
      }

      try {
        const encrypted = await encryptSecret(candidate.api_key_secret as string);
        const { error: updateError } = await supabaseAdmin
          .from("stripe_connections")
          .update({
            api_key_secret: null,
            api_key_secret_encrypted: encrypted,
            encryption_version: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", candidate.company_id);

        if (updateError) throw updateError;
        updated += 1;
      } catch (error) {
        failures.push({
          company_id: candidate.company_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.done("backfill.completed", {
      dry_run: dryRun,
      scanned: records?.length ?? 0,
      candidates: candidates.length,
      updated,
      failures: failures.length,
    });

    return jsonResponse(
      {
        dry_run: dryRun,
        scanned: records?.length ?? 0,
        candidates: candidates.length,
        updated,
        failed: failures.length,
        failures,
      },
      200,
      {},
      req,
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("backfill.failed", { status, message });
    return jsonResponse({ error: message }, status, {}, req);
  }
});
