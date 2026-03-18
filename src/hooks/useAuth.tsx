import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth as useClerkAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
import {
  setSupabaseAccessTokenProvider,
  clearSupabaseAccessTokenProvider,
} from '@/integrations/supabase/client';
import { AUTH_CONFIG } from '@/lib/auth-config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authProvider: 'clerk_supabase_bridge';
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLERK_PUBLISHABLE_KEY = AUTH_CONFIG.clerkPublishableKey;
const CLERK_SUPABASE_JWT_TEMPLATE = AUTH_CONFIG.clerkSupabaseJwtTemplate;
const CLERK_FRONTEND_API_URL = AUTH_CONFIG.clerkFrontendApiUrl;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getAuthOrigin = () => {
  if (AUTH_CONFIG.appUrl) {
    return trimTrailingSlash(AUTH_CONFIG.appUrl);
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

const getAuthUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAuthOrigin()}${normalizedPath}`;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeClerkError = error as {
      message?: unknown;
      errors?: Array<{ longMessage?: unknown; message?: unknown }>;
    };
    const firstError = maybeClerkError.errors?.[0];
    if (typeof firstError?.longMessage === 'string' && firstError.longMessage) {
      return firstError.longMessage;
    }
    if (typeof firstError?.message === 'string' && firstError.message) {
      return firstError.message;
    }
    if (typeof maybeClerkError.message === 'string' && maybeClerkError.message) {
      return maybeClerkError.message;
    }
  }

  return fallback;
};

const toError = (error: unknown, fallback: string) => new Error(getErrorMessage(error, fallback));

type ClerkUserLike = {
  id: string;
  fullName?: string | null;
  imageUrl?: string;
  createdAt?: number | null;
  updatedAt?: number | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
};

const toSupabaseLikeUserFromClerk = (clerkUser: ClerkUserLike): User => {
  const nowIso = new Date().toISOString();
  const createdAtIso = clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : nowIso;
  const updatedAtIso = clerkUser.updatedAt ? new Date(clerkUser.updatedAt).toISOString() : createdAtIso;

  return {
    id: clerkUser.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: clerkUser.primaryEmailAddress?.emailAddress ?? undefined,
    phone: undefined,
    created_at: createdAtIso,
    updated_at: updatedAtIso,
    app_metadata: {
      provider: 'clerk',
      providers: ['clerk'],
    },
    user_metadata: {
      full_name: clerkUser.fullName ?? undefined,
      avatar_url: clerkUser.imageUrl ?? undefined,
      clerk_id: clerkUser.id,
    },
    identities: [],
  } as User;
};

function ClerkAuthProviderImpl({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session] = useState<Session | null>(null);
  const tokenProviderRef = useRef<(() => Promise<string | null>) | null>(null);

  const { isLoaded: clerkLoaded, isSignedIn: isClerkSignedIn, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { isLoaded: clerkUserLoaded, user: clerkUser } = useUser();
  const { isLoaded: signInLoaded, signIn: clerkSignIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp: clerkSignUp, setActive: setSignUpActive } = useSignUp();

  const getClerkSupabaseToken = useCallback(async (): Promise<string | null> => {
    return (
      (await getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE })) ||
      (await getToken()) ||
      null
    );
  }, [getToken]);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isClerkSignedIn) {
      clearSupabaseAccessTokenProvider();
      tokenProviderRef.current = null;
      return;
    }

    tokenProviderRef.current = getClerkSupabaseToken;
    setSupabaseAccessTokenProvider(async () => {
      const provider = tokenProviderRef.current;
      if (!provider) return null;
      return provider();
    });

    return () => {
      clearSupabaseAccessTokenProvider();
      tokenProviderRef.current = null;
    };
  }, [clerkLoaded, isClerkSignedIn, getClerkSupabaseToken]);

  useEffect(() => {
    if (!clerkUserLoaded) return;

    if (isClerkSignedIn && clerkUser) {
      setUser(toSupabaseLikeUserFromClerk(clerkUser as ClerkUserLike));
      return;
    }

    setUser(null);
  }, [clerkUserLoaded, isClerkSignedIn, clerkUser]);

  const ensureSupabaseTokenReady = useCallback(async (): Promise<Error | null> => {
    const token = await getClerkSupabaseToken();
    if (!token) {
      return new Error(
        `Missing Clerk token. Configure Clerk JWT template "${CLERK_SUPABASE_JWT_TEMPLATE}" for Supabase.`,
      );
    }

    return null;
  }, [getClerkSupabaseToken]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!signUpLoaded || !clerkSignUp || !setSignUpActive) {
      return { error: new Error('Clerk sign-up is not ready yet.'), needsEmailConfirmation: false };
    }

    const normalizedEmail = normalizeEmail(email);
    const nameParts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    try {
      const signUpAttempt = await clerkSignUp.create({
        emailAddress: normalizedEmail,
        password,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      });

      if (signUpAttempt.status === 'complete' && signUpAttempt.createdSessionId) {
        await setSignUpActive({ session: signUpAttempt.createdSessionId });
        const bridgeError = await ensureSupabaseTokenReady();
        return {
          error: bridgeError,
          needsEmailConfirmation: false,
        };
      }

      try {
        await clerkSignUp.prepareEmailAddressVerification({
          strategy: 'email_link',
          redirectUrl: getAuthUrl('/auth/callback'),
        });
      } catch {
        await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }

      return { error: null, needsEmailConfirmation: true };
    } catch (error) {
      return { error: toError(error, 'Could not create account with Clerk.'), needsEmailConfirmation: false };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!signInLoaded || !clerkSignIn || !setSignInActive) {
      return { error: new Error('Clerk sign-in is not ready yet.') };
    }

    try {
      const signInAttempt = await clerkSignIn.create({
        identifier: normalizeEmail(email),
        password,
      });

      if (signInAttempt.status !== 'complete' || !signInAttempt.createdSessionId) {
        return { error: new Error(`Additional verification is required before sign in can complete (${signInAttempt.status}).`) };
      }

      await setSignInActive({ session: signInAttempt.createdSessionId });
      const bridgeError = await ensureSupabaseTokenReady();
      return { error: bridgeError };
    } catch (error) {
      return { error: toError(error, 'Could not sign in with Clerk.') };
    }
  };

  const signInWithGoogle = async (redirectPath = '/dashboard') => {
    if (!signInLoaded || !clerkSignIn) {
      return { error: new Error('Clerk sign-in is not ready yet.') };
    }

    try {
      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: getAuthUrl('/auth/callback'),
        redirectUrlComplete: getAuthUrl(redirectPath),
      });
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Could not start Google sign-in with Clerk.') };
    }
  };

  const resendConfirmationEmail = async (_email: string, redirectPath = '/auth') => {
    if (!signUpLoaded || !clerkSignUp) {
      return { error: new Error('Clerk sign-up is not ready yet.') };
    }

    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;

    try {
      try {
        await clerkSignUp.prepareEmailAddressVerification({
          strategy: 'email_link',
          redirectUrl: getAuthUrl(safeRedirectPath),
        });
      } catch {
        await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Could not resend confirmation email.') };
    }
  };

  const requestPasswordReset = async (email: string, redirectPath = '/auth') => {
    const normalizedEmail = normalizeEmail(email);
    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;

    if (!normalizedEmail) {
      return { error: new Error('Email is required.') };
    }

    if (CLERK_FRONTEND_API_URL) {
      const resetUrl = new URL('/sign-in', CLERK_FRONTEND_API_URL);
      resetUrl.searchParams.set('redirect_url', getAuthUrl(safeRedirectPath));
      window.location.assign(resetUrl.toString());
      return { error: null };
    }

    if (!signInLoaded || !clerkSignIn) {
      return { error: new Error('Clerk sign-in is not ready yet.') };
    }

    try {
      await clerkSignIn.create({
        strategy: 'reset_password_email_code',
        identifier: normalizedEmail,
      });
      return { error: null };
    } catch (error) {
      return { error: toError(error, 'Could not start password reset with Clerk.') };
    }
  };

  const signOut = async () => {
    clearSupabaseAccessTokenProvider();
    tokenProviderRef.current = null;
    setUser(null);
    await clerkSignOut();
  };

  const loading = !clerkLoaded || !clerkUserLoaded || (isClerkSignedIn && !clerkUser);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authProvider: 'clerk_supabase_bridge',
      signUp,
      signIn,
      signInWithGoogle,
      resendConfirmationEmail,
      requestPasswordReset,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (AUTH_CONFIG.isAuthMisconfigured) {
    console.error(
      'Clerk is required but not configured. Set VITE_CLERK_PUBLISHABLE_KEY in frontend env vars.',
    );
  }

  if (CLERK_PUBLISHABLE_KEY) {
    return <ClerkAuthProviderImpl>{children}</ClerkAuthProviderImpl>;
  }

  throw new Error('Clerk-only auth mode requires VITE_CLERK_PUBLISHABLE_KEY.');
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
