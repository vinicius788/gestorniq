import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, AlertTriangle, CreditCard, Check, Loader2, ExternalLink, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrial } from '@/hooks/useTrial';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatPlanLabel = (plan?: string | null) => {
  if (!plan || plan === 'free') return 'Standard';
  return plan
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

type StandardPlan = {
  name: string;
  price: string;
  annualPrice: string;
  description: string;
  badge: string;
  features: string[];
  cta: string;
};

function TrialStatusBanner({ isTrialExpired, daysRemaining, trial }: { isTrialExpired: boolean; daysRemaining: number; trial: any }) {
  return (
    <div className={`mb-8 p-6 rounded-xl border ${
      isTrialExpired 
        ? 'bg-destructive/10 border-destructive/20' 
        : 'bg-warning/10 border-warning/20'
    }`}>
      <div className="flex items-start gap-4">
        {isTrialExpired ? (
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
        ) : (
          <Clock className="h-6 w-6 text-warning shrink-0" />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">
            {isTrialExpired 
              ? 'Your trial has expired' 
              : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining in your trial`
            }
          </h2>
          <p className="text-muted-foreground mt-1">
            {isTrialExpired 
              ? 'Subscribe to continue using GestorNiq and access your metrics dashboard.'
              : 'Subscribe now to ensure uninterrupted access to your metrics dashboard.'
            }
          </p>
          {trial && (
            <p className="text-sm text-muted-foreground mt-2">
              Trial {isTrialExpired ? 'ended' : 'ends'}: {new Date(trial.ends_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveSubscriptionBanner({ subscription, onManage, managingPortal }: { subscription: any; onManage: () => void; managingPortal: boolean }) {
  if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) return null;

  return (
    <div className="mb-8 p-6 rounded-xl border bg-success/10 border-success/20">
      <div className="flex items-start gap-4">
        <Check className="h-6 w-6 text-success shrink-0" />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">
            {formatPlanLabel(subscription.plan)} Plan — Active
          </h2>
          <p className="text-muted-foreground mt-1">
            {subscription.status === 'trialing' 
              ? 'Your subscription trial is active.'
              : 'Your subscription is active. Thank you for subscribing!'
            }
          </p>
          {subscription.current_period_end && (
            <p className="text-sm text-muted-foreground mt-2">
              Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onManage} disabled={managingPortal}>
          {managingPortal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings2 className="h-4 w-4 mr-2" />}
          Manage Subscription
        </Button>
      </div>
    </div>
  );
}

function PricingCard({ plan, onSubscribe, isLoading, perMonthLabel, billedAnnuallyLabel }: {
  plan: StandardPlan;
  onSubscribe: () => void;
  isLoading: boolean;
  perMonthLabel: string;
  billedAnnuallyLabel: string;
}) {
  return (
    <div className="relative rounded-2xl border p-6 bg-primary/5 border-primary shadow-lg">
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">{plan.badge}</span>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
        <span className="text-muted-foreground">{perMonthLabel}</span>
        <p className="text-sm text-muted-foreground mt-2">
          {billedAnnuallyLabel}: {plan.annualPrice}
        </p>
      </div>
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="w-full"
        variant="default"
        onClick={onSubscribe}
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" />{plan.cta}</>
        )}
      </Button>
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trial, subscription, daysRemaining, isTrialActive, isTrialExpired, hasActiveAccess, refetch } = useTrial();
  const { company } = useCompany();
  const { t } = useLanguage();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  const standardPlan: StandardPlan = t.pricing.standard;

  const handleSubscribe = async () => {
    if (!company) {
      toast.error('Company not found. Please complete onboarding first.');
      return;
    }

    setIsProcessingCheckout(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: 'standard', company_id: company.id },
      });

      if (error) throw new Error(error.message || 'Failed to create checkout session');

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw new Error(error.message || 'Failed to open customer portal');

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to open subscription management');
    } finally {
      setManagingPortal(false);
    }
  };

  const checkoutStatus = useMemo(() => searchParams.get('checkout'), [searchParams]);

  useEffect(() => {
    if (checkoutStatus === 'success') {
      void refetch();
    }
  }, [checkoutStatus, refetch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Checkout result feedback */}
        {checkoutStatus === 'success' && (
          <div className="mb-8 p-6 rounded-xl border bg-success/10 border-success/20">
            <div className="flex items-center gap-4">
              <Check className="h-6 w-6 text-success" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Welcome to GestorNiq!</h2>
                <p className="text-muted-foreground">Your subscription is being activated. It may take a moment to reflect.</p>
              </div>
              <Button variant="default" onClick={() => { refetch(); navigate('/dashboard'); }}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {checkoutStatus === 'canceled' && (
          <div className="mb-8 p-6 rounded-xl border bg-warning/10 border-warning/20">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Checkout canceled</h2>
                <p className="text-muted-foreground">No charge was made. You can restart checkout whenever you are ready.</p>
              </div>
            </div>
          </div>
        )}

        {/* Active subscription banner */}
        <ActiveSubscriptionBanner 
          subscription={subscription} 
          onManage={handleManageSubscription} 
          managingPortal={managingPortal} 
        />

        {/* Trial Status Banner (only if no active subscription) */}
        {!hasActiveAccess && (
          <TrialStatusBanner isTrialExpired={isTrialExpired} daysRemaining={daysRemaining} trial={trial} />
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {hasActiveAccess ? 'Your Plan' : 'Choose your annual plan'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {hasActiveAccess ? 'Manage your subscription below.' : 'Standard plan: $39/month billed annually. Cancel anytime.'}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-xl mx-auto mb-12">
          <PricingCard
            plan={standardPlan}
            onSubscribe={handleSubscribe}
            isLoading={isProcessingCheckout}
            perMonthLabel={t.pricing.perMonth}
            billedAnnuallyLabel={t.pricing.billedAnnually}
          />
        </div>

        {/* Back to Dashboard */}
        {(isTrialActive || hasActiveAccess) && (
          <div className="text-center">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← {hasActiveAccess ? 'Back to Dashboard' : `Continue with trial (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left)`}
            </Button>
          </div>
        )}

        {/* Manage subscription for active subscribers */}
        {hasActiveAccess && subscription?.stripe_subscription_id && (
          <div className="text-center mt-4">
            <Button variant="outline" onClick={handleManageSubscription} disabled={managingPortal}>
              {managingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Manage Subscription on Stripe
            </Button>
          </div>
        )}

        {/* Security Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            [Secure] Annual billing powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
