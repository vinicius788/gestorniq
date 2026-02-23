import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { getCorsHeaders, getRequiredEnv, HttpError, jsonResponse } from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("disconnect-stripe-revenue", req);

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

    await enforceRateLimit({
      req,
      supabaseAdmin,
      scope: "disconnect-stripe-revenue",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 600, maxRequests: 5 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 20 },
      ],
    });

    const body = await req.json().catch(() => ({}));
    const companyIdFromBody = typeof body.company_id === "string" ? body.company_id : null;

    let companyQuery = supabaseClient.from("companies").select("id, data_source").eq("user_id", user.id);
    if (companyIdFromBody) {
      companyQuery = companyQuery.eq("id", companyIdFromBody);
    }

    const { data: company, error: companyError } = await companyQuery.maybeSingle();
    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(404, "Company not found");

    const { error: deleteError } = await supabaseAdmin
      .from("stripe_connections")
      .delete()
      .eq("company_id", company.id);

    if (deleteError) throw new HttpError(500, deleteError.message);

    if (company.data_source === "stripe") {
      const { error: companyUpdateError } = await supabaseAdmin
        .from("companies")
        .update({
          data_source: "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", company.id);

      if (companyUpdateError) throw new HttpError(500, companyUpdateError.message);
    }

    await writeAuditLog(supabaseAdmin, {
      action: "billing.stripe_revenue_disconnected",
      companyId: company.id,
      actorUserId: user.id,
      actorIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      metadata: {
        previous_data_source: company.data_source,
      },
    });

    logger.done("stripe_revenue.disconnected", { company_id: company.id });

    return jsonResponse({ disconnected: true, company_id: company.id }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("stripe_revenue.disconnect_failed", { status, message });

    return jsonResponse({ error: message }, status, {}, req);
  }
});
