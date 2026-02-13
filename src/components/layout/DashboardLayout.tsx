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

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
  const { company, loading: companyLoading, updateCompany } = useCompany();
  const { showOnboarding, setShowOnboarding, setOnboardingComplete, setDemoMode } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDemoQuery = new URLSearchParams(location.search).get("demo") === "1";
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
    <>
      <div className="min-h-screen bg-background">
        {/* Trial Banner */}
        <TrialBanner />
        
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="lg:pl-64 min-w-0">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-6 overflow-x-hidden">
            <AccessGuard>
              <Outlet />
            </AccessGuard>
          </main>
        </div>
      </div>
    </>
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
