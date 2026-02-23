import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { writeAuditLog } from "../_shared/audit.ts";
import { encryptSecret } from "../_shared/encryption.ts";
import {
  getCorsHeaders,
  getRequiredEnv,
  HttpError,
  isProductionRuntime,
  jsonResponse,
} from "../_shared/http.ts";
import { createRequestLogger } from "../_shared/logging.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const logger = createRequestLogger("connect-stripe-revenue", req);

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
      scope: "connect-stripe-revenue",
      userId: user.id,
      rules: [
        { name: "burst", windowSeconds: 600, maxRequests: 5 },
        { name: "hourly", windowSeconds: 3600, maxRequests: 20 },
      ],
    });

    const body = await req.json().catch(() => ({}));
    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
    const companyIdFromBody = typeof body.company_id === "string" ? body.company_id : null;

    if (!apiKey || !/^sk_(test|live)_/.test(apiKey)) {
      throw new HttpError(400, "A valid Stripe secret key is required");
    }

    if (isProductionRuntime()) {
      getRequiredEnv("STRIPE_CONNECTIONS_ENCRYPTION_KEY");
    }

    let companyQuery = supabaseClient
      .from("companies")
      .select("id")
      .eq("user_id", user.id);

    if (companyIdFromBody) {
      companyQuery = companyQuery.eq("id", companyIdFromBody);
    }

    const { data: company, error: companyError } = await companyQuery.maybeSingle();
    if (companyError) throw new HttpError(500, companyError.message);
    if (!company) throw new HttpError(404, "Company not found");

    const stripe = new Stripe(apiKey, { apiVersion: "2025-08-27.basil" });

    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieve();
    } catch (error) {
      logger.error("stripe.auth.failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw new HttpError(400, "Unable to authenticate with Stripe key");
    }

    const keyLast4 = apiKey.slice(-4);
    const encryptedSecret = await encryptSecret(apiKey);

    const { error: upsertError } = await supabaseAdmin
      .from("stripe_connections")
      .upsert(
        {
          company_id: company.id,
          stripe_account_id: account.id,
          api_key_secret: null,
          api_key_secret_encrypted: encryptedSecret,
          encryption_version: 1,
          key_last4: keyLast4,
          livemode: account.livemode ?? false,
          status: "connected",
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      );

    if (upsertError) throw new HttpError(500, upsertError.message);

    const { error: companyUpdateError } = await supabaseAdmin
      .from("companies")
      .update({
        data_source: "stripe",
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    if (companyUpdateError) throw new HttpError(500, companyUpdateError.message);

    await writeAuditLog(supabaseAdmin, {
      action: "billing.stripe_revenue_connected",
      companyId: company.id,
      actorUserId: user.id,
      actorIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      metadata: {
        stripe_account_id: account.id,
        livemode: account.livemode ?? false,
        key_last4: keyLast4,
      },
    });

    logger.done("stripe_revenue.connected", {
      company_id: company.id,
      stripe_account_id: account.id,
      livemode: account.livemode ?? false,
    });

    return jsonResponse({
      connected: true,
      company_id: company.id,
      stripe_account_id: account.id,
      livemode: account.livemode ?? false,
      key_last4: keyLast4,
    }, 200, {}, req);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.fail("stripe_revenue.connect_failed", { status, message });

    return jsonResponse({ error: message }, status, {}, req);
  }
});
