import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth as useClerkAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { AUTH_CONFIG, AUTH_PROVIDER, CLERK_ONLY_MODE } from '@/lib/auth-config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authProvider: 'supabase' | 'clerk_supabase_bridge';
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
const CLERK_SUPABASE_PROVIDER = AUTH_CONFIG.clerkSupabaseProvider;
const CLERK_FRONTEND_API_URL = AUTH_CONFIG.clerkFrontendApiUrl;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`;
  return atob(padded);
};

const getTokenIssuer = (token: string): string | null => {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const decodedPayload = decodeBase64Url(payload);
    const parsedPayload = JSON.parse(decodedPayload) as { iss?: string };
    return typeof parsedPayload.iss === 'string' ? parsedPayload.iss : null;
  } catch {
    return null;
  }
};

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

function SupabaseAuthProviderImpl({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const normalizedEmail = normalizeEmail(email);
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return {
      error: error as Error | null,
      needsEmailConfirmation: !data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectPath = '/dashboard') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { error: error as Error | null };
    }

    if (data?.url) {
      window.location.assign(data.url);
      return { error: null };
    }

    return { error: new Error('Could not start Google authentication.') };
  };

  const resendConfirmationEmail = async (email: string, redirectPath = '/auth') => {
    const normalizedEmail = normalizeEmail(email);
    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;

    if (!normalizedEmail) {
      return { error: new Error('Email is required.') };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}${safeRedirectPath}`,
      },
    });

    return { error: error as Error | null };
  };

  const requestPasswordReset = async (email: string, redirectPath = '/auth') => {
    const normalizedEmail = normalizeEmail(email);
    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;

    if (!normalizedEmail) {
      return { error: new Error('Email is required.') };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}${safeRedirectPath}`,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authProvider: 'supabase',
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

function ClerkAuthProviderImpl({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [bridgingSession, setBridgingSession] = useState(false);

  const { isLoaded: clerkLoaded, isSignedIn: isClerkSignedIn, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { isLoaded: clerkUserLoaded, user: clerkUser } = useUser();
  const { isLoaded: signInLoaded, signIn: clerkSignIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp: clerkSignUp, setActive: setSignUpActive } = useSignUp();

  useEffect(() => {
    if (CLERK_ONLY_MODE) {
      setSession(null);
      setSupabaseLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setSupabaseLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setSupabaseLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!CLERK_ONLY_MODE || !clerkUserLoaded) return;

    if (isClerkSignedIn && clerkUser) {
      setUser(toSupabaseLikeUserFromClerk(clerkUser as ClerkUserLike));
    } else {
      setUser(null);
    }
  }, [clerkUserLoaded, isClerkSignedIn, clerkUser]);

  const bridgeClerkToSupabase = useCallback(async (): Promise<Error | null> => {
    if (CLERK_ONLY_MODE) {
      return null;
    }

    const token = await getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE });
    if (!token) {
      return new Error('Missing Clerk token. Configure a Clerk JWT template for Supabase.');
    }

    const issuer = getTokenIssuer(token);
    const candidateProviders = [CLERK_SUPABASE_PROVIDER, issuer, 'clerk'].filter(
      (value, index, source): value is string => Boolean(value) && source.indexOf(value) === index,
    );

    let lastError: Error | null = null;

    for (const provider of candidateProviders) {
      const { error } = await supabase.auth.signInWithIdToken({ provider, token });
      if (!error) {
        return null;
      }
      lastError = error as Error;
    }

    const lastMessage = lastError?.message.toLowerCase() ?? '';
    if (lastMessage.includes('custom oidc provider') && lastMessage.includes('not allowed')) {
      return new Error(
        'Supabase is not configured to trust Clerk yet. Enable Clerk (OIDC) in Supabase Auth providers and retry login.',
      );
    }

    return (
      lastError ??
      new Error('Could not exchange Clerk token for a Supabase session. Check Clerk issuer/JWT template and Supabase provider configuration.')
    );
  }, [getToken]);

  useEffect(() => {
    if (CLERK_ONLY_MODE) return;
    if (!clerkLoaded || !isClerkSignedIn || session) return;

    let cancelled = false;

    const syncSession = async () => {
      setBridgingSession(true);
      try {
        const error = await bridgeClerkToSupabase();
        if (!cancelled && error) {
          console.error('Failed to exchange Clerk token for Supabase session:', error.message);
        }
      } finally {
        if (!cancelled) {
          setBridgingSession(false);
        }
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isClerkSignedIn, session, bridgeClerkToSupabase]);

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
        const bridgeError = await bridgeClerkToSupabase();
        return {
          error: bridgeError,
          needsEmailConfirmation: false,
        };
      }

      try {
        await clerkSignUp.prepareEmailAddressVerification({
          strategy: 'email_link',
          redirectUrl: `${window.location.origin}/auth/callback`,
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
      const bridgeError = await bridgeClerkToSupabase();
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
        redirectUrl: `${window.location.origin}/auth/callback`,
        redirectUrlComplete: `${window.location.origin}${redirectPath}`,
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
          redirectUrl: `${window.location.origin}${safeRedirectPath}`,
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
      resetUrl.searchParams.set('redirect_url', `${window.location.origin}${safeRedirectPath}`);
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
    if (CLERK_ONLY_MODE) {
      setSession(null);
      setUser(null);
      await clerkSignOut();
      return;
    }

    await Promise.all([
      supabase.auth.signOut(),
      clerkSignOut(),
    ]);
  };

  const loading = CLERK_ONLY_MODE
    ? !clerkLoaded || !clerkUserLoaded || (isClerkSignedIn && !clerkUser)
    : supabaseLoading || !clerkLoaded || bridgingSession;

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
  if (AUTH_CONFIG.rawClerkOnlyMode) {
    console.warn(
      'VITE_CLERK_ONLY_MODE=true is ignored. Clerk -> Supabase bridge will be used.',
    );
  }

  if (CLERK_PUBLISHABLE_KEY) {
    return <ClerkAuthProviderImpl>{children}</ClerkAuthProviderImpl>;
  }

  return <SupabaseAuthProviderImpl>{children}</SupabaseAuthProviderImpl>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  if (context.authProvider !== AUTH_PROVIDER) {
    // Keep a deterministic runtime hint when env/auth setup drifts.
    console.warn(`Auth provider mismatch detected. Expected ${AUTH_PROVIDER}, got ${context.authProvider}.`);
  }
  return context;
}
