import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Key, Bell, CreditCard, Shield, Check, Globe, Clock, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useTrial } from "@/hooks/useTrial";
import { useApp } from "@/contexts/AppContext";
import { DemoModeToggle } from "@/components/dashboard/DemoModeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Language } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

interface StripeConnectionState {
  loading: boolean;
  connected: boolean;
  stripeAccountId: string | null;
  keyLast4: string | null;
  livemode: boolean | null;
  status: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

const INITIAL_STRIPE_CONNECTION: StripeConnectionState = {
  loading: true,
  connected: false,
  stripeAccountId: null,
  keyLast4: null,
  livemode: null,
  status: null,
  connectedAt: null,
  lastSyncedAt: null,
};

interface NotificationPreferences {
  emailNotifications: boolean;
  weeklyReport: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  weeklyReport: true,
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, requestPasswordReset } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { company, updateCompany, refetch: refetchCompany } = useCompany();
  const { trial, subscription, daysRemaining, isTrialExpired } = useTrial();
  const { isDemoMode } = useApp();
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [loadingNotificationPreferences, setLoadingNotificationPreferences] = useState(true);
  const [savingNotificationPreferences, setSavingNotificationPreferences] = useState(false);
  const [stripeApiKey, setStripeApiKey] = useState("");
  const [stripeConnection, setStripeConnection] = useState<StripeConnectionState>(INITIAL_STRIPE_CONNECTION);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    companyName: "",
  });
  const hasPaidSubscription = subscription?.status === "active" || subscription?.status === "trialing";

  useEffect(() => {
    setProfileForm({
      fullName: (user?.user_metadata?.full_name as string) || "",
      email: user?.email || "",
      companyName: company?.name || "",
    });
  }, [user?.email, user?.user_metadata?.full_name, company?.name]);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;

    const loadNotificationPreferences = async () => {
      if (!userId) {
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setLoadingNotificationPreferences(false);
        return;
      }

      setLoadingNotificationPreferences(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("email_notifications_enabled,weekly_reports_enabled")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setNotificationPreferences({
          emailNotifications: data?.email_notifications_enabled ?? true,
          weeklyReport: data?.weekly_reports_enabled ?? true,
        });
      } catch (loadError) {
        if (cancelled) return;

        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        toast.error(loadError instanceof Error ? loadError.message : "Failed to load notification preferences.");
      } finally {
        if (!cancelled) {
          setLoadingNotificationPreferences(false);
        }
      }
    };

    loadNotificationPreferences();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loadStripeConnection = useCallback(async () => {
    if (!company?.id) {
      setStripeConnection((prev) => ({ ...prev, loading: false }));
      return;
    }

    setStripeConnection((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.functions.invoke("stripe-revenue-status", {
        body: { company_id: company.id },
      });

      if (error) throw error;

      const connection = data?.connection;
      setStripeConnection({
        loading: false,
        connected: Boolean(data?.connected),
        stripeAccountId: connection?.stripe_account_id ?? null,
        keyLast4: connection?.key_last4 ?? null,
        livemode: typeof connection?.livemode === "boolean" ? connection.livemode : null,
        status: connection?.status ?? null,
        connectedAt: connection?.connected_at ?? null,
        lastSyncedAt: connection?.last_synced_at ?? null,
      });
    } catch (error) {
      setStripeConnection({ ...INITIAL_STRIPE_CONNECTION, loading: false });
      toast.error("Failed to load Stripe connection status.");
    }
  }, [company?.id]);

  useEffect(() => {
    loadStripeConnection();
  }, [loadStripeConnection]);

  const handleSyncStripe = useCallback(
    async (silent: boolean = false) => {
      if (!company?.id) {
        toast.error("Company not found. Complete onboarding first.");
        return;
      }

      setSyncingStripe(true);
      try {
        const { data, error } = await supabase.functions.invoke("sync-stripe-revenue", {
          body: { company_id: company.id, months: 12 },
        });

        if (error) throw error;

        await Promise.all([loadStripeConnection(), refetchCompany()]);

        if (!silent) {
          toast.success(`Stripe revenue synced (${data?.months_synced ?? 12} months).`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to sync Stripe revenue.";
        toast.error(message);
      } finally {
        setSyncingStripe(false);
      }
    },
    [company?.id, loadStripeConnection, refetchCompany],
  );

  const handleConnectStripe = async () => {
    if (!company?.id) {
      toast.error("Company not found. Complete onboarding first.");
      return;
    }

    const apiKey = stripeApiKey.trim();
    if (!/^sk_(test|live)_/.test(apiKey)) {
      toast.error("Enter a valid Stripe secret key (sk_test_... or sk_live_...).");
      return;
    }

    setConnectingStripe(true);
    try {
      const { error } = await supabase.functions.invoke("connect-stripe-revenue", {
        body: {
          company_id: company.id,
          api_key: apiKey,
        },
      });

      if (error) throw error;

      setStripeApiKey("");
      await Promise.all([loadStripeConnection(), refetchCompany()]);
      toast.success("Stripe connected. Running initial revenue sync.");
      await handleSyncStripe(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect Stripe.";
      toast.error(message);
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!company?.id) {
      toast.error("Company not found. Complete onboarding first.");
      return;
    }

    setDisconnectingStripe(true);
    try {
      const { error } = await supabase.functions.invoke("disconnect-stripe-revenue", {
        body: { company_id: company.id },
      });

      if (error) throw error;

      await Promise.all([loadStripeConnection(), refetchCompany()]);
      toast.success("Stripe connection removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect Stripe.";
      toast.error(message);
    } finally {
      setDisconnectingStripe(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("You need to be signed in.");
      return;
    }

    const fullName = profileForm.fullName.trim();
    const companyName = profileForm.companyName.trim();
    const normalizedEmail = profileForm.email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Email is required.");
      return;
    }

    if (!companyName) {
      toast.error("Company name is required.");
      return;
    }

    setSavingProfile(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          email: normalizedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      const authUpdates: { email?: string; data?: Record<string, string> } = {
        data: { full_name: fullName },
      };
      const emailChanged = normalizedEmail !== (user.email || "").toLowerCase();
      if (emailChanged) {
        authUpdates.email = normalizedEmail;
      }

      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw authError;

      if (company && companyName !== company.name) {
        await updateCompany({ name: companyName });
      } else {
        await refetchCompany();
      }

      toast.success(
        emailChanged
          ? "Profile updated. Check your inbox to confirm the email change."
          : "Profile updated.",
      );
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    const email = profileForm.email.trim().toLowerCase();
    if (!email) {
      toast.error("Set a valid email first.");
      return;
    }

    setSendingPasswordReset(true);
    try {
      const { error } = await requestPasswordReset(email, '/auth');
      if (error) throw error;
      toast.success("Password reset instructions sent.");
    } catch (resetError) {
      toast.error(resetError instanceof Error ? resetError.message : "Failed to send reset email.");
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const handleEnable2fa = () => {
    navigate("/support");
    toast.info("Use your authentication provider to enable 2FA. Support page opened.");
  };

  const handleNotificationPreferenceChange = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!user) {
      toast.error("You need to be signed in.");
      return;
    }

    const previous = notificationPreferences;
    const next = { ...notificationPreferences, [key]: value };

    setNotificationPreferences(next);
    setSavingNotificationPreferences(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          email_notifications_enabled: next.emailNotifications,
          weekly_reports_enabled: next.weeklyReport,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Profile not found for this account.");

      toast.success("Notification preferences updated.");
    } catch (saveError) {
      setNotificationPreferences(previous);
      toast.error(saveError instanceof Error ? saveError.message : "Failed to update notification preferences.");
    } finally {
      setSavingNotificationPreferences(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.profile}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.settings.fullName}</label>
                <Input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.settings.email}</label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.settings.company}</label>
                <Input
                  type="text"
                  value={profileForm.companyName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, companyName: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.settings.saveChanges}
              </Button>
            </div>
          </div>

          {/* Revenue Source Integration */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.integration}</h3>
            </div>

            {stripeConnection.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Stripe connection status...
              </div>
            ) : stripeConnection.connected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-success/20 bg-success/10 p-4">
                  <p className="font-medium text-foreground">Stripe connected</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Account: {stripeConnection.stripeAccountId}</p>
                    <p>Key: ••••••••{stripeConnection.keyLast4}</p>
                    <p>Mode: {stripeConnection.livemode ? "Live" : "Test"}</p>
                    <p>
                      Last sync:{" "}
                      {stripeConnection.lastSyncedAt
                        ? new Date(stripeConnection.lastSyncedAt).toLocaleString()
                        : "Not synced yet"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleSyncStripe()} disabled={syncingStripe}>
                    {syncingStripe ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Sync Revenue
                  </Button>
                  <Button variant="outline" onClick={handleDisconnectStripe} disabled={disconnectingStripe}>
                    {disconnectingStripe ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect Stripe using a read-only key and sync your monthly recurring revenue snapshots automatically.
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Recommended: create a restricted key in Stripe with read access to subscriptions and prices.
                </p>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Stripe secret key</label>
                  <Input
                    type="password"
                    value={stripeApiKey}
                    onChange={(event) => setStripeApiKey(event.target.value)}
                    placeholder="sk_test_..."
                    autoComplete="off"
                  />
                </div>
                <Button onClick={handleConnectStripe} disabled={connectingStripe}>
                  {connectingStripe ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Connect Stripe
                </Button>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.security}</h3>
            </div>
            <div className="space-y-4">
              <Button variant="outline" onClick={handleResetPassword} disabled={sendingPasswordReset}>
                {sendingPasswordReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.settings.changePassword}
              </Button>
              <Button variant="outline" onClick={handleEnable2fa}>
                {t.settings.enable2fa}
              </Button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          {/* Language */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.language}</h3>
            </div>
            <div className="space-y-2">
              {(Object.entries(availableLanguages) as [Language, { label: string; flag: string }][]).map(([code, { label, flag }]) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3
                    ${language === code
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted/30 border-border hover:border-primary/50'
                    }
                  `}
                >
                  <span className="text-lg">{flag}</span>
                  <span className="font-medium text-foreground">{label}</span>
                  {language === code && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.notifications}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.settings.emailNotifications}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.emailNotificationsDescription}</p>
                </div>
                <Switch
                  checked={notificationPreferences.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationPreferenceChange("emailNotifications", checked)}
                  disabled={loadingNotificationPreferences || savingNotificationPreferences}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.settings.weeklyReports}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.weeklyReportsDescription}</p>
                </div>
                <Switch
                  checked={notificationPreferences.weeklyReport}
                  onCheckedChange={(checked) => handleNotificationPreferenceChange("weeklyReport", checked)}
                  disabled={loadingNotificationPreferences || savingNotificationPreferences}
                />
              </div>
              {(loadingNotificationPreferences || savingNotificationPreferences) && (
                <p className="text-xs text-muted-foreground">
                  {loadingNotificationPreferences ? "Loading preferences..." : "Saving preferences..."}
                </p>
              )}
            </div>
          </div>

          {/* Plan & Trial */}
          <div className="metric-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t.settings.plan}</h3>
            
            {/* Trial Status */}
            {trial && !hasPaidSubscription && (
              <div className={`p-4 rounded-lg mb-4 ${
                isTrialExpired 
                  ? 'bg-destructive/10 border border-destructive/20' 
                  : 'bg-warning/10 border border-warning/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className={`h-4 w-4 ${isTrialExpired ? 'text-destructive' : 'text-warning'}`} />
                  <p className="font-medium text-foreground">
                    {isTrialExpired ? 'Trial Expired' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isTrialExpired 
                    ? 'Subscribe to continue using GestorNiq' 
                    : `Trial ends ${new Date(trial.ends_at).toLocaleDateString()}`
                  }
                </p>
              </div>
            )}
            
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-lg font-bold text-foreground">
                {hasPaidSubscription ? 'Standard Plan' : 'Free Trial'}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasPaidSubscription ? 'Annual billing at $39/month (billed yearly).' : '3-day free access'}
              </p>
              {hasPaidSubscription && subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-2">
                  Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button 
              variant="default" 
              className="w-full mt-4"
              onClick={() => navigate('/dashboard/billing')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {t.settings.manageBilling}
            </Button>
          </div>

          {/* Demo Mode */}
          <div className="metric-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Data Mode</h3>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-foreground">Demo Mode</p>
                <p className="text-sm text-muted-foreground">
                  {isDemoMode ? 'Showing sample data' : 'Showing real data'}
                </p>
              </div>
              <DemoModeToggle />
            </div>
            {company?.data_source && (
              <p className="text-xs text-muted-foreground mt-3">
                Data source: {company.data_source}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
