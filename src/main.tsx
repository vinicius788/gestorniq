import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { AUTH_CONFIG, getAuthConfigWarnings } from "@/lib/auth-config";
import { initObservability } from "@/lib/observability";
import { AppErrorBoundary } from "@/components/system/AppErrorBoundary";
import {
  SUPABASE_CONFIG,
  SUPABASE_CONFIG_ERROR_MESSAGE,
} from "@/integrations/supabase/client";

initObservability();

const redirectToCanonicalAppUrl = (): boolean => {
  if (typeof window === "undefined") return false;
  if (!import.meta.env.PROD) return false;
  if (!AUTH_CONFIG.appUrl) return false;

  const canonicalUrl = new URL(AUTH_CONFIG.appUrl);
  const currentHost = window.location.hostname.toLowerCase();
  const isLocalHost =
    currentHost === "localhost" ||
    currentHost === "127.0.0.1" ||
    currentHost === "[::1]";

  if (isLocalHost) return false;

  const currentUrl = new URL(window.location.href);
  if (
    currentUrl.host.toLowerCase() === canonicalUrl.host.toLowerCase() &&
    currentUrl.protocol === canonicalUrl.protocol
  ) {
    return false;
  }

  const targetUrl = new URL(currentUrl.toString());
  targetUrl.protocol = canonicalUrl.protocol;
  targetUrl.host = canonicalUrl.host;
  window.location.replace(targetUrl.toString());
  return true;
};

const authWarnings = getAuthConfigWarnings();
authWarnings.forEach((warning) => console.warn(`[AUTH_CONFIG] ${warning}`));

const renderConfigurationError = ({
  missingSupabaseConfig,
  missingRequiredClerkConfig,
}: {
  missingSupabaseConfig: boolean;
  missingRequiredClerkConfig: boolean;
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="w-full max-w-xl rounded-xl border border-destructive/30 bg-card p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Environment setup required</h1>
      <p className="text-sm text-muted-foreground">
        The app could not start because required frontend variables are missing.
      </p>
      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-foreground space-y-2">
        {missingSupabaseConfig && (
          <p>
            Set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
        )}
        {missingRequiredClerkConfig && (
          <>
            <p>Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your frontend environment.</p>
            <p>If needed, also set <code>VITE_CLERK_SUPABASE_JWT_TEMPLATE</code>.</p>
          </>
        )}
        <p>Restart the dev server (or redeploy) after updating environment variables.</p>
      </div>
    </div>
  </div>
);

const missingRequiredClerkConfig = AUTH_CONFIG.isAuthMisconfigured;
const missingSupabaseConfig = !SUPABASE_CONFIG.isConfigured;
const shouldRenderConfigurationError = missingSupabaseConfig || missingRequiredClerkConfig;

if (missingSupabaseConfig) {
  console.error(SUPABASE_CONFIG_ERROR_MESSAGE);
}

if (missingRequiredClerkConfig) {
  console.error(
    "Clerk is required but not configured. Set VITE_CLERK_PUBLISHABLE_KEY and redeploy.",
  );
}

const appContent = shouldRenderConfigurationError ? (
  renderConfigurationError({
    missingSupabaseConfig,
    missingRequiredClerkConfig,
  })
) : AUTH_CONFIG.clerkPublishableKey ? (
  <ClerkProvider publishableKey={AUTH_CONFIG.clerkPublishableKey}>
    <App />
  </ClerkProvider>
) : (
  <App />
);

const app = <AppErrorBoundary>{appContent}</AppErrorBoundary>;

if (!redirectToCanonicalAppUrl()) {
  createRoot(document.getElementById("root")!).render(app);
}
