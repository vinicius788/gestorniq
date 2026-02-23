import { HttpError, extractClientIp } from "./http.ts";

interface RateLimitRule {
  name: string;
  windowSeconds: number;
  maxRequests: number;
}

interface EnforceRateLimitArgs {
  req: Request;
  supabaseAdmin: any;
  scope: string;
  userId: string;
  rules: RateLimitRule[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

const applyLimit = async (
  supabaseAdmin: any,
  scope: string,
  bucketKey: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> => {
  const { data, error } = await supabaseAdmin
    .rpc("check_rate_limit", {
      p_scope: `${scope}:${rule.name}`,
      p_bucket_key: bucketKey,
      p_window_seconds: rule.windowSeconds,
      p_limit: rule.maxRequests,
    })
    .single();

  if (error) {
    throw new HttpError(500, `Rate limit check failed: ${error.message}`);
  }

  return data as RateLimitResult;
};

export async function enforceRateLimit({
  req,
  supabaseAdmin,
  scope,
  userId,
  rules,
}: EnforceRateLimitArgs) {
  const ip = extractClientIp(req);

  for (const rule of rules) {
    const keys = [`user:${userId}`, `ip:${ip}`];

    for (const key of keys) {
      const result = await applyLimit(supabaseAdmin, scope, key, rule);
      if (!result.allowed) {
        const resetAt = Date.parse(result.reset_at);
        const retryAfterSeconds = Number.isFinite(resetAt)
          ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
          : rule.windowSeconds;

        throw new HttpError(
          429,
          `Rate limit exceeded for ${scope}. Retry in ${retryAfterSeconds} seconds.`,
        );
      }
    }
  }
}
