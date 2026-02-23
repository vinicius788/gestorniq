import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("stripe-revenue-status", req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "Missing or invalid authorization header");
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new HttpError(401, `Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new HttpError(401, "User not authenticated");
    logger.setUserId(user.id);

    const body = await req.json().catch(() => ({}));
    const companyIdFromBody = typeof body.company_id === "string" ? body.company_id : null;

    let companyQuery = supabaseClient.from("companies").select("id").eq("user_id", user.id);
    if (companyIdFromBody) {
      companyQuery = companyQuery.eq("id", companyIdFromBody);
    }

    const { data: company, error: companyError } = await companyQuery.maybeSingle();
    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(404, "Company not found");

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("stripe_connections")
      .select(
        "stripe_account_id, key_last4, livemode, status, connected_at, last_synced_at, sync_status, sync_in_progress_at",
      )
      .eq("company_id", company.id)
      .maybeSingle();

    if (connectionError) throw new HttpError(500, connectionError.message);

    logger.done("stripe_revenue.status", {
      company_id: company.id,
      connected: Boolean(connection),
      sync_status: connection?.sync_status ?? null,
    });

    return jsonResponse({
      connected: Boolean(connection),
      company_id: company.id,
      connection: connection ?? null,
    }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("stripe_revenue.status_failed", { status, message });

    return jsonResponse({ error: message }, status, {}, req);
  }
});
