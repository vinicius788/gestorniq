const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const rawAppUrl =
  import.meta.env.VITE_APP_URL ||
  import.meta.env.VITE_AUTH_REDIRECT_ORIGIN;

const normalizeAppUrl = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
};

// Clerk-only auth is always enforced in this app runtime.
export const CLERK_ONLY_MODE = true;
const requireClerk = true;
const isClerkEnabled = Boolean(clerkPublishableKey);
const appUrl = normalizeAppUrl(rawAppUrl);

export const AUTH_CONFIG = {
  clerkPublishableKey,
  isClerkEnabled,
  requireClerk,
  isAuthMisconfigured: requireClerk && !isClerkEnabled,
  appUrl,
  clerkOnlyMode: CLERK_ONLY_MODE,
  clerkSupabaseJwtTemplate: import.meta.env.VITE_CLERK_SUPABASE_JWT_TEMPLATE || 'supabase',
  clerkFrontendApiUrl:
    import.meta.env.VITE_CLERK_FRONTEND_API_URL ||
    import.meta.env.CLERK_FRONTEND_API_URL ||
    null,
} as const;

export const AUTH_PROVIDER = 'clerk_supabase_bridge' as const;

export function getAuthConfigWarnings(): string[] {
  const warnings: string[] = [];

  if (AUTH_CONFIG.isAuthMisconfigured) {
    warnings.push(
      'Clerk is required in this environment but VITE_CLERK_PUBLISHABLE_KEY is missing. Configure frontend env vars and redeploy.',
    );
  }

  return warnings;
}
