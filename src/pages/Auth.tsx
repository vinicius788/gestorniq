import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Mail, Lock, User, ArrowRight, Loader2, Zap, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const isDemoRequested = searchParams.get('demo') === '1';
  const postAuthPath = isDemoRequested ? '/dashboard?demo=1' : '/dashboard';

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

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailSchema = z.string().email(t.auth.invalidEmail);
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;

    if (mode !== 'reset') {
      const passwordSchema = z.string().min(6, t.auth.invalidPassword);
      const passwordResult = passwordSchema.safeParse(password);
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
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
        return;
      }

      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t.auth.invalidCredentials);
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t.auth.loginSuccess);
        persistDemoFlags();
        navigate(postAuthPath);
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(t.auth.emailInUse);
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t.auth.signupSuccess);
        persistDemoFlags();
        navigate(postAuthPath);
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
        toast.error(t.auth.googleError);
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">GestorNiq</span>
        </div>

        <div className="metric-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {isReset ? 'Reset Password' : isLogin ? t.auth.welcomeBack : t.auth.createAccount}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isReset ? 'Enter your email and we\'ll send you a reset link.' : isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
            </p>
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
                  <Input type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-11 h-12" />
                </div>
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.auth.email}</label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11 h-12" />
              </div>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>

            {!isReset && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.auth.password}</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11 h-12" />
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
  );
}
