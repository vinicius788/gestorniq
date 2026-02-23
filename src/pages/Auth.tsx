import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { Mail, Lock, User, ArrowRight, Loader2, ArrowLeft, ShieldCheck, TrendingUp, Clock3 } from 'lucide-react';
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AUTH_CONFIG } from '@/lib/auth-config';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, signInWithGoogle, resendConfirmationEmail, requestPasswordReset, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const isDemoRequested = searchParams.get('demo') === '1';
  const oauthError = searchParams.get('auth_error');
  const clerkOnlyMode = AUTH_CONFIG.clerkOnlyMode;
  const postAuthPath = isDemoRequested ? '/dashboard?demo=1' : '/dashboard';

  const pitch = {
    label: 'Fundraising-ready in minutes',
    title: 'Sign in and turn scattered metrics into an investor story.',
    subtitle: 'Go from spreadsheet chaos to a board-ready dashboard for fundraising and weekly decisions.',
    bullets: [
      '3/6/12-month forecast to show business direction',
      'Valuation and equity pricing based on real growth',
      'MRR breakdown in the format investors expect',
    ],
    trust: ['No card for trial', 'One-click cancellation', 'Secure data access'],
  };

  const persistDemoFlags = useCallback(() => {
    if (!isDemoRequested) return;
    localStorage.setItem('gestorniq-demo-mode', 'true');
    localStorage.setItem('gestorniq-onboarding-complete', 'true');
  }, [isDemoRequested]);

  useEffect(() => {
    if (user && !authLoading) {
      persistDemoFlags();
      navigate(postAuthPath);
    }
  }, [user, authLoading, navigate, postAuthPath, persistDemoFlags]);

  useEffect(() => {
    if (!oauthError) return;

    toast.error(oauthError);

    const params = new URLSearchParams(searchParams);
    params.delete('auth_error');
    const nextSearch = params.toString();
    navigate(nextSearch ? `/auth?${nextSearch}` : '/auth', { replace: true });
  }, [oauthError, navigate, searchParams]);

  const validateForm = (candidateEmail: string, candidatePassword: string) => {
    const newErrors: typeof errors = {};
    const emailSchema = z.string().email(t.auth.invalidEmail);
    const emailResult = emailSchema.safeParse(candidateEmail);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;

    if (mode !== 'reset') {
      const passwordSchema = z.string().min(6, t.auth.invalidPassword);
      const passwordResult = passwordSchema.safeParse(candidatePassword);
      if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === 'signup' && !fullName.trim()) {
      newErrors.fullName = t.auth.nameRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const passwordValue = password;
    if (!validateForm(normalizedEmail, passwordValue)) return;

    setLoading(true);
    try {
      if (mode === 'reset') {
        const { error } = await requestPasswordReset(normalizedEmail, '/auth');
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Password reset instructions sent. Check your inbox.');
        setMode('login');
        return;
      }

      if (mode === 'login') {
        const { error } = await signIn(normalizedEmail, passwordValue);
        if (error) {
          const errorMessage = error.message.toLowerCase();

          if (errorMessage.includes('failed to fetch')) {
            toast.error('Could not reach authentication server. Please check your connection and try again.');
            return;
          }

          if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
            if (clerkOnlyMode) {
              toast.error('Password sign-in is not enabled for this Clerk project. Use Continue with Google or enable Email + Password in Clerk.');
            } else {
              toast.error(t.auth.invalidCredentials);
            }
            return;
          }

          if (errorMessage.includes('email not confirmed')) {
            const { error: resendError } = await resendConfirmationEmail(normalizedEmail, '/auth');
            if (resendError) {
              toast.error('Email not confirmed. We could not resend the confirmation email.');
            } else {
              toast.error('Email not confirmed. We sent a new confirmation link.');
            }
            return;
          }

          if (error.message.includes('Invalid login credentials')) {
            toast.error(t.auth.invalidCredentials);
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t.auth.loginSuccess);
        persistDemoFlags();
        navigate(postAuthPath, { replace: true });
      } else {
        const { error, needsEmailConfirmation } = await signUp(
          normalizedEmail,
          passwordValue,
          fullName.trim(),
        );
        if (error) {
          const signupErrorMessage = error.message.toLowerCase();
          if (clerkOnlyMode && (signupErrorMessage.includes('not authorized') || signupErrorMessage.includes('strategy') || signupErrorMessage.includes('password'))) {
            toast.error('Email/password sign-up is disabled in Clerk. Enable Email + Password in Clerk or use Continue with Google.');
            return;
          }

          if (error.message.includes('already registered')) {
            toast.error(t.auth.emailInUse);
          } else {
            toast.error(error.message);
          }
          return;
        }
        if (needsEmailConfirmation) {
          toast.success('Account created. Please confirm your email to continue.');
          setMode('login');
          return;
        }
        toast.success(t.auth.signupSuccess);
        persistDemoFlags();
        navigate(postAuthPath, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle(postAuthPath);
      if (error) {
        toast.error(error.message || t.auth.googleError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLogin = mode === 'login';
  const isReset = mode === 'reset';

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-0 w-[520px] h-[520px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-0 w-[520px] h-[520px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:items-center">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">{pitch.label}</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-foreground leading-tight text-balance">
              {pitch.title}
            </h1>
            <p className="text-lg text-muted-foreground mt-5 text-balance">
              {pitch.subtitle}
            </p>

            <div className="mt-8 space-y-3">
              {pitch.bullets.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/90">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {pitch.trust.map((item) => (
                <div key={item} className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-center text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                This week goal: leave with reliable numbers for decisions and fundraising.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                <span>Initial setup in under 10 minutes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:max-w-lg lg:mx-0 lg:justify-self-end">
          <div className="mb-6 flex justify-center">
            <BrandLogo size="md" theme="dark" />
          </div>

        <div className="metric-card p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {isReset ? 'Reset Password' : isLogin ? t.auth.welcomeBack : t.auth.createAccount}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isReset ? 'Enter your email and we\'ll send you a reset link.' : isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
            </p>
            {!isReset && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium">
                <Clock3 className="h-3.5 w-3.5" />
                3-day trial to validate value before subscribing
              </div>
            )}
          </div>

          {!isReset && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 mb-6"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t.auth.continueWithGoogle}
                  </>
                )}
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t.auth.or}</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.auth.fullName}</label>
                <div className="relative mt-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-11 h-12"
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.auth.email}</label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12"
                />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>

            {!isReset && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.auth.password}</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    name="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12"
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full h-12" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isReset ? 'Send Reset Link' : isLogin ? t.auth.login : t.auth.signup}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Forgot password link */}
          {isLogin && (
            <div className="text-center mt-4">
              <button onClick={() => { setMode('reset'); setErrors({}); }} className="text-sm text-primary hover:underline">
                Forgot your password?
              </button>
            </div>
          )}

          {isReset && (
            <div className="text-center mt-4">
              <button onClick={() => { setMode('login'); setErrors({}); }} className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </div>
          )}

          {!isReset && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? t.auth.noAccount : t.auth.hasAccount}{" "}
              <button 
                onClick={() => { setMode(isLogin ? 'signup' : 'login'); setErrors({}); }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? t.auth.signup : t.auth.login}
              </button>
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t.auth.backToHome}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
