import { useEffect, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AUTH_CONFIG } from '@/lib/auth-config';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeClerkError = error as {
      errors?: Array<{ longMessage?: unknown; message?: unknown }>;
    };
    const firstError = maybeClerkError.errors?.[0];
    if (typeof firstError?.longMessage === 'string' && firstError.longMessage) {
      return firstError.longMessage;
    }
    if (typeof firstError?.message === 'string' && firstError.message) {
      return firstError.message;
    }
  }

  return 'OAuth callback failed. Please try signing in again.';
};

export default function AuthCallback() {
  const clerk = useClerk();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!AUTH_CONFIG.clerkPublishableKey || processedRef.current) return;
    processedRef.current = true;

    const completeCallback = async () => {
      try {
        await clerk.handleRedirectCallback({
          signInUrl: '/auth',
          signUpUrl: '/auth',
          signInFallbackRedirectUrl: '/dashboard',
          signUpFallbackRedirectUrl: '/dashboard',
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        navigate(`/auth?auth_error=${encodeURIComponent(errorMessage)}`, { replace: true });
      }
    };

    completeCallback();
  }, [clerk, navigate]);

  if (!AUTH_CONFIG.clerkPublishableKey) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Finalizing secure sign in...</span>
      </div>
    </div>
  );
}
