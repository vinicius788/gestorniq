import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CreditCard, Check, Loader2, ExternalLink, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrial } from '@/hooks/useTrial';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            {subscription.plan?.charAt(0).toUpperCase() + subscription.plan?.slice(1)} Plan — Active
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

function PricingCard({ plan, highlighted, badge, onSubscribe, loadingPlan }: {
  plan: { name: string; price: string; description: string; features: string[] };
  highlighted: boolean;
  badge?: string;
  onSubscribe: (name: string) => void;
  loadingPlan: string | null;
}) {
  return (
    <div className={`relative rounded-2xl border p-6 ${
      highlighted ? 'bg-primary/5 border-primary shadow-lg scale-105' : 'bg-card border-border'
    }`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">{badge}</span>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
        {plan.price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
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
        variant={highlighted ? 'default' : 'outline'}
        onClick={() => onSubscribe(plan.name)}
        disabled={loadingPlan !== null}
      >
        {loadingPlan === plan.name ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
        ) : plan.price === 'Custom' ? (
          'Contact Sales'
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" />Subscribe</>
        )}
      </Button>
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const { trial, subscription, daysRemaining, isTrialActive, isTrialExpired, hasActiveAccess, refetch } = useTrial();
  const { company } = useCompany();
  const { t } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      description: 'For early-stage founders',
      features: [
        'Core metrics (MRR/ARR/Growth)',
        'Basic valuation calculator',
        'Dashboard & charts',
        'Manual + CSV import',
        'Email support',
      ],
    },
    {
      name: 'Pro',
      price: '$59',
      description: 'For growth-stage startups',
      features: [
        'Everything in Starter',
        'Autonomous CFO forecasts (3/6/12m)',
        'Valuation scenarios',
        'Equity pricing calculator',
        'Export reports & data',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For larger organizations',
      features: [
        'Everything in Pro',
        'Multi-company support',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'SSO & advanced security',
      ],
    },
  ];

  const handleSubscribe = async (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href = 'mailto:sales@gestorniq.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (!company) {
      toast.error('Company not found. Please complete onboarding first.');
      return;
    }

    setLoadingPlan(planName);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planName.toLowerCase(), company_id: company.id }
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
      setLoadingPlan(null);
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

  // Check for checkout success/cancel query params
  const params = new URLSearchParams(window.location.search);
  const checkoutStatus = params.get('checkout');

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
            {hasActiveAccess ? 'Your Plan' : 'Choose your plan'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {hasActiveAccess ? 'Manage your subscription below.' : 'Get back to tracking your metrics. Cancel anytime.'}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, i) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              highlighted={i === 1}
              badge={i === 1 ? 'Most Popular' : undefined}
              onSubscribe={handleSubscribe}
              loadingPlan={loadingPlan}
            />
          ))}
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
            🔒 Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
