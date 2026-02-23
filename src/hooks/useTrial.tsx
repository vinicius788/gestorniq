import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

interface Trial {
  id: string;
  company_id: string;
  started_at: string;
  ends_at: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface TrialContextType {
  trial: Trial | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  daysRemaining: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasActiveAccess: boolean; // trial active OR subscription active/trialing
  refetch: () => Promise<void>;
}

const TrialContext = createContext<TrialContextType | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const { company, loading: companyLoading } = useCompany();
  const [trial, setTrial] = useState<Trial | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialAndSubscription = useCallback(async () => {
    if (!company) {
      setTrial(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch trial
      const { data: trialData, error: trialError } = await supabase
        .from('trials')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (trialError) throw trialError;
      
      if (trialData) {
        setTrial({
          ...trialData,
          status: trialData.status as 'active' | 'expired' | 'cancelled'
        });
      } else {
        setTrial(null);
      }

      // Best-effort Stripe sync (non-blocking for UI flow).
      try {
        await supabase.functions.invoke('check-subscription');
      } catch (syncError) {
        console.warn('Subscription sync failed:', syncError);
      }

      // Fetch subscription for the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) throw subError;
        setSubscription(subData);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching trial/subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trial/subscription');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (!companyLoading) {
      void fetchTrialAndSubscription();
    }
  }, [companyLoading, fetchTrialAndSubscription]);

  // Calculate days remaining
  const daysRemaining = trial 
    ? Math.max(0, Math.ceil((new Date(trial.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialActive = trial?.status === 'active' && daysRemaining > 0;
  const isTrialExpired = trial?.status === 'expired' || (trial?.status === 'active' && daysRemaining <= 0);
  
  // Check if subscription is active or trialing
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  // User has access if trial is active OR has active subscription
  const hasActiveAccess = isTrialActive || hasActiveSubscription;

  return (
    <TrialContext.Provider value={{
      trial,
      subscription,
      loading,
      error,
      daysRemaining,
      isTrialActive,
      isTrialExpired,
      hasActiveAccess,
      refetch: fetchTrialAndSubscription,
    }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const context = useContext(TrialContext);
  if (context === undefined) {
    throw new Error('useTrial must be used within a TrialProvider');
  }
  return context;
}
