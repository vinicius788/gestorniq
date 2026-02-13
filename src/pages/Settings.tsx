import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Key, Bell, Moon, CreditCard, Shield, Check, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useTrial } from "@/hooks/useTrial";
import { useApp } from "@/contexts/AppContext";
import { DemoModeToggle } from "@/components/dashboard/DemoModeToggle";
import type { Language } from "@/lib/i18n";

export default function Settings() {
  const navigate = useNavigate();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { company } = useCompany();
  const { trial, daysRemaining, isTrialActive, isTrialExpired } = useTrial();
  const { isDemoMode } = useApp();
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(false);

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
                <input 
                  type="text"
                  defaultValue="John Doe"
                  className="mt-1 w-full h-10 rounded-lg border border-border bg-muted/50 px-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.settings.email}</label>
                <input 
                  type="email"
                  defaultValue="john@startup.com"
                  className="mt-1 w-full h-10 rounded-lg border border-border bg-muted/50 px-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.settings.company}</label>
                <input 
                  type="text"
                  defaultValue="Startup Inc."
                  className="mt-1 w-full h-10 rounded-lg border border-border bg-muted/50 px-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button>{t.settings.saveChanges}</Button>
            </div>
          </div>

          {/* Revenue Source Integration */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-6">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.integration}</h3>
            </div>
            
            {stripeConnected ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/20">
                <Check className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{t.settings.integrationConnected}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.integrationLastSync} 5 minutes ago</p>
                </div>
                <Button variant="outline" size="sm">{t.settings.disconnect}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t.settings.integrationDescription}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {t.settings.stripeNote}
                </p>
                <Button onClick={() => setStripeConnected(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t.settings.connectRevenue}
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
              <Button variant="outline">{t.settings.changePassword}</Button>
              <Button variant="outline">{t.settings.enable2fa}</Button>
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
              <Moon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t.settings.appearance}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t.settings.darkMode}</p>
                <p className="text-sm text-muted-foreground">{t.settings.darkModeDescription}</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
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
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t.settings.weeklyReports}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.weeklyReportsDescription}</p>
                </div>
                <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
              </div>
            </div>
          </div>

          {/* Plan & Trial */}
          <div className="metric-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t.settings.plan}</h3>
            
            {/* Trial Status */}
            {trial && (
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
              <p className="text-lg font-bold text-foreground">Free Trial</p>
              <p className="text-sm text-muted-foreground">3-day free access</p>
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
