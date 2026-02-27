const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

const LOCALHOST_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i;

const normalizeOrigin = (value: string): string => value.trim().replace(/\/$/, "");

const normalizeLowerOrigin = (value: string): string => normalizeOrigin(value).toLowerCase();

const isWildcardOriginPattern = (value: string): boolean =>
  /^https?:\/\/\*\.[a-z0-9.-]+$/i.test(value);

const matchesWildcardOrigin = (pattern: string, origin: string): boolean => {
  try {
    const targetUrl = new URL(origin);
    const [patternProtocol, patternHost] = pattern.split("://");
    if (!patternProtocol || !patternHost) return false;
    if (targetUrl.protocol !== `${patternProtocol}:`) return false;
    if (!patternHost.startsWith("*.")) return false;

    const suffix = patternHost.slice(1).toLowerCase(); // ".example.com"
    const hostname = targetUrl.hostname.toLowerCase();
    if (!hostname.endsWith(suffix)) return false;

    // Avoid matching the apex domain when wildcard requires a subdomain.
    return hostname !== suffix.slice(1);
  } catch {
    return false;
  }
};

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const getRequiredEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new HttpError(500, `${key} is not configured`);
  return value;
};

export const getRuntimeEnvironment = () =>
  (Deno.env.get("APP_ENV") || Deno.env.get("ENV") || Deno.env.get("NODE_ENV") || "development")
    .toLowerCase()
    .trim();

const RELEASE_RUNTIME_ENVIRONMENTS = new Set([
  "production",
  "prod",
  "staging",
  "stage",
  "release",
]);

const isCiRuntime = () =>
  (Deno.env.get("CI") ?? "").toLowerCase() === "true" ||
  (Deno.env.get("GITHUB_ACTIONS") ?? "").toLowerCase() === "true";

export const isProductionRuntime = () => {
  const env = getRuntimeEnvironment();
  return RELEASE_RUNTIME_ENVIRONMENTS.has(env) || Boolean(Deno.env.get("DENO_DEPLOYMENT_ID"));
};

const getConfiguredCorsOrigins = (): string[] => {
  const configured = Deno.env.get("CORS_ALLOWED_ORIGINS");
  const entries = [
    Deno.env.get("APP_URL") ?? "",
    Deno.env.get("SITE_URL") ?? "",
    ...(configured ? configured.split(",") : []),
  ]
    .map((value) => normalizeLowerOrigin(value))
    .filter((value) => value.length > 0);

  return [...new Set(entries)];
};

const isConfiguredOriginAllowed = (requestOrigin: string, configuredOrigins: string[]): boolean =>
  configuredOrigins.some((configuredOrigin) => {
    if (isWildcardOriginPattern(configuredOrigin)) {
      return matchesWildcardOrigin(configuredOrigin, requestOrigin);
    }
    return configuredOrigin === requestOrigin;
  });

const resolveFallbackConfiguredOrigin = (configuredOrigins: string[]): string => {
  const exactOrigin = configuredOrigins.find((origin) => !isWildcardOriginPattern(origin));
  return exactOrigin ?? "null";
};

const resolveCorsOrigin = (req?: Request): string => {
  const requestOrigin = normalizeLowerOrigin(req?.headers.get("origin") ?? "");
  const configuredOrigins = getConfiguredCorsOrigins();
  const isConfiguredRequestOrigin =
    requestOrigin.length > 0 && isConfiguredOriginAllowed(requestOrigin, configuredOrigins);

  if (isConfiguredRequestOrigin) return requestOrigin;

  if (!isProductionRuntime()) {
    const allowAllLocal = (Deno.env.get("CORS_ALLOW_ALL_LOCAL") ?? "").toLowerCase() === "true";
    if (allowAllLocal) return "*";
    if (requestOrigin.length > 0 && LOCALHOST_ORIGIN_REGEX.test(requestOrigin)) {
      return requestOrigin;
    }
    if (configuredOrigins.length > 0) {
      return resolveFallbackConfiguredOrigin(configuredOrigins);
    }
    return "http://localhost:5173";
  }

  if (configuredOrigins.length > 0) return resolveFallbackConfiguredOrigin(configuredOrigins);
  return "null";
};

export const getCorsHeaders = (req?: Request): Record<string, string> => ({
  "Access-Control-Allow-Origin": resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
  "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
});

export const corsHeaders = getCorsHeaders();

export const getBaseUrl = (
  req: Request,
  log: (step: string, details?: unknown) => void,
): string => {
  const appUrl = Deno.env.get("APP_URL");
  if (appUrl) return appUrl.replace(/\/$/, "");

  const siteUrl = Deno.env.get("SITE_URL");
  if (siteUrl && !isProductionRuntime()) {
    log("APP_URL missing, using SITE_URL fallback in non-production", {
      runtime: getRuntimeEnvironment(),
      origin: req.headers.get("origin"),
    });
    return siteUrl.replace(/\/$/, "");
  }

  if (!isProductionRuntime()) {
    const fallbackUrl = "http://localhost:3000";
    log("Missing APP_URL/SITE_URL in non-production, using safe local default", {
      runtime: getRuntimeEnvironment(),
      origin: req.headers.get("origin"),
      ci: isCiRuntime(),
      fallback_url: fallbackUrl,
    });
    return fallbackUrl;
  }

  if (isProductionRuntime()) {
    log("Missing APP_URL in production", {
      runtime: getRuntimeEnvironment(),
      origin: req.headers.get("origin"),
    });
    throw new HttpError(500, "APP_URL must be configured in production");
  }
};

export const jsonResponse = (
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  req?: Request,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

export const extractClientIp = (req: Request): string => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",").map((part) => part.trim());
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
};
