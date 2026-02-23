const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const rawClerkOnlyMode = import.meta.env.VITE_CLERK_ONLY_MODE === 'true';

// Clerk-only mode is development-only because production data access depends on Supabase RLS.
export const CLERK_ONLY_MODE = rawClerkOnlyMode && import.meta.env.DEV;

export const AUTH_CONFIG = {
  clerkPublishableKey,
  isClerkEnabled: Boolean(clerkPublishableKey),
  rawClerkOnlyMode,
  clerkOnlyMode: CLERK_ONLY_MODE,
  clerkSupabaseJwtTemplate: import.meta.env.VITE_CLERK_SUPABASE_JWT_TEMPLATE || 'supabase',
  clerkSupabaseProvider: import.meta.env.VITE_CLERK_SUPABASE_PROVIDER?.trim(),
  clerkFrontendApiUrl:
    import.meta.env.VITE_CLERK_FRONTEND_API_URL ||
    import.meta.env.CLERK_FRONTEND_API_URL ||
    null,
} as const;

export const AUTH_PROVIDER = AUTH_CONFIG.isClerkEnabled
  ? 'clerk_supabase_bridge'
  : 'supabase';

export function getAuthConfigWarnings(): string[] {
  const warnings: string[] = [];

  if (AUTH_CONFIG.rawClerkOnlyMode && !import.meta.env.DEV) {
    warnings.push(
      'VITE_CLERK_ONLY_MODE=true is ignored outside development. Production requires Clerk->Supabase session bridge.',
    );
  }

  return warnings;
}
