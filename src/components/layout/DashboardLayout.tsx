import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { CompanyProvider, useCompany } from "@/hooks/useCompany";
import { TrialProvider } from "@/hooks/useTrial";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { AccessGuard } from "@/components/guards/AccessGuard";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { Loader2 } from "lucide-react";
import { AppShell } from "./AppShell";

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
  const [workspaceAction, setWorkspaceAction] = useState<'create' | 'recover' | null>(null);
  const { company, loading: companyLoading, error: companyError, updateCompany, ensureCompany } = useCompany();
  const { showOnboarding, setShowOnboarding, setOnboardingComplete, setDemoMode } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDemoQuery = new URLSearchParams(location.search).get("demo") === "1";
  const checkoutQuery = new URLSearchParams(location.search).get("checkout");
  const isDemoStored = localStorage.getItem("gestorniq-demo-mode") === "true";

  // Show onboarding if company exists but onboarding not completed
  useEffect(() => {
    if (!companyLoading && company) {
      if (!company.onboarding_completed) {
        setShowOnboarding(true);
        setOnboardingComplete(false);
      } else {
        setShowOnboarding(false);
        setOnboardingComplete(true);
      }
    }
  }, [company, companyLoading, setShowOnboarding, setOnboardingComplete]);

  useEffect(() => {
    if (!loading && !user) {
      navigate(isDemoQuery || isDemoStored ? '/auth?demo=1' : '/auth');
    }
  }, [user, loading, navigate, isDemoQuery, isDemoStored]);

  useEffect(() => {
    if (!checkoutQuery) return;
    if (location.pathname !== "/dashboard") return;

    navigate(`/dashboard/billing?checkout=${encodeURIComponent(checkoutQuery)}`, { replace: true });
  }, [checkoutQuery, location.pathname, navigate]);

  useEffect(() => {
    const shouldBootstrapDemo =
      Boolean(user) &&
      Boolean(company) &&
      !companyLoading &&
      !company?.onboarding_completed &&
      (isDemoQuery || isDemoStored);

    if (!shouldBootstrapDemo) return;

    let cancelled = false;

    const bootstrapDemo = async () => {
      setIsBootstrappingDemo(true);
      try {
        await updateCompany({
          data_source: 'demo',
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        });

        if (cancelled) return;
        setDemoMode(true);
        setOnboardingComplete(true);
        setShowOnboarding(false);

        if (isDemoQuery) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error bootstrapping demo onboarding:', error);
      } finally {
        if (!cancelled) {
          setIsBootstrappingDemo(false);
        }
      }
    };

    bootstrapDemo();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    company,
    companyLoading,
    isDemoQuery,
    isDemoStored,
    updateCompany,
    setDemoMode,
    setOnboardingComplete,
    setShowOnboarding,
    navigate,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isBootstrappingDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!companyLoading && !company) {
    const isWorkspaceBusy = companyLoading || workspaceAction !== null;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Workspace setup required</h2>
          <p className="text-sm text-muted-foreground">
            We could not find your workspace. Create or recover your company to continue.
          </p>
          {companyError && (
            <p className="text-xs text-destructive">{companyError}</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              disabled={isWorkspaceBusy}
              onClick={async () => {
                setWorkspaceAction('create');
                try {
                  await ensureCompany();
                } finally {
                  setWorkspaceAction(null);
                }
              }}
            >
              {workspaceAction === 'create' ? 'Creating workspace...' : 'Create workspace'}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
              disabled={isWorkspaceBusy}
              onClick={async () => {
                setWorkspaceAction('recover');
                try {
                  await ensureCompany();
                } finally {
                  setWorkspaceAction(null);
                }
              }}
            >
              {workspaceAction === 'recover' ? 'Recovering workspace...' : 'Recover workspace'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // BLOCKING: If onboarding is not completed, render ONLY the wizard — no dashboard behind
  if (!companyLoading && company && !company.onboarding_completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <OnboardingWizard 
          open={true} 
          onOpenChange={(open) => {
            // Don't allow closing if onboarding not completed
            if (!open && company && !company.onboarding_completed) {
              return;
            }
            setShowOnboarding(open);
          }} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TrialBanner />
      <AppShell
        sidebarOpen={sidebarOpen}
        onDismissSidebar={() => setSidebarOpen(false)}
        sidebar={<DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        header={<DashboardHeader onMenuClick={() => setSidebarOpen(true)} />}
      >
        <AccessGuard>
          <Outlet />
        </AccessGuard>
      </AppShell>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <CompanyProvider>
      <AppProvider>
        <TrialProvider>
          <DashboardContent />
        </TrialProvider>
      </AppProvider>
    </CompanyProvider>
  );
}
