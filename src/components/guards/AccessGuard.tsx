import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useTrial } from '@/hooks/useTrial';

interface AccessGuardProps {
  children: React.ReactNode;
}

export function AccessGuard({ children }: AccessGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { company, loading: companyLoading } = useCompany();
  const { hasActiveAccess, isTrialExpired, loading: trialLoading } = useTrial();

  const isLoading = companyLoading || trialLoading;
  const isBillingPage = location.pathname === '/dashboard/billing';

  useEffect(() => {
    if (isLoading) return;

    // If no company, let DashboardLayout handle showing onboarding
    if (!company) {
      return;
    }

    // If onboarding not completed, let DashboardLayout handle showing onboarding
    if (!company.onboarding_completed) {
      return;
    }

    // If trial expired and no active subscription, redirect to billing
    // But don't redirect if already on billing page
    if (isTrialExpired && !hasActiveAccess && !isBillingPage) {
      navigate('/dashboard/billing', { replace: true });
    }
  }, [company, hasActiveAccess, isTrialExpired, isLoading, isBillingPage, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow access to billing page even if trial expired
  if (isBillingPage) {
    return <>{children}</>;
  }

  // Block access completely if trial expired and no active subscription
  // Return null to prevent any content from rendering
  if (isTrialExpired && !hasActiveAccess) {
    return null;
  }

  return <>{children}</>;
}
