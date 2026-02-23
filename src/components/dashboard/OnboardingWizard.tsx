import { useState, useEffect } from 'react';
import { Building2, Coins, Database, FileSpreadsheet, CheckCircle2, ArrowRight, ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { Currency } from '@/lib/currency';

const currencies: { code: Currency; symbol: string }[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'BRL', symbol: 'R$' },
];

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingWizard({ open, onOpenChange }: OnboardingWizardProps) {
  const { setOnboardingComplete, setDemoMode } = useApp();
  const { company, updateCompany } = useCompany();
  const { t } = useLanguage();
  
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedSource, setSelectedSource] = useState<string>('demo');
  const [saving, setSaving] = useState(false);

  // Initialize form values from company data
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setCurrency((company.currency as Currency) || 'USD');
      setSelectedSource(company.data_source || 'demo');
    }
  }, [company]);

  const dataSources = [
    { id: 'demo', label: 'Demo Mode', description: 'Explore with sample data first', icon: Sparkles, recommended: true },
    { id: 'manual', label: t.onboarding.step2.manual, description: t.onboarding.step2.manualDescription, icon: Database, recommended: false },
    { id: 'csv', label: t.onboarding.step2.csv, description: t.onboarding.step2.csvDescription, icon: FileSpreadsheet, recommended: false },
    { id: 'stripe', label: t.onboarding.step2.stripe, description: t.onboarding.step2.stripeDescription, icon: CreditCard, recommended: false },
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save company settings and mark onboarding as completed
      await updateCompany({ 
        name: companyName, 
        currency,
        data_source: selectedSource as 'demo' | 'manual' | 'csv' | 'stripe',
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      });
      
      // Enable demo mode if selected
      if (selectedSource === 'demo') {
        setDemoMode(true);
      }
      
      setOnboardingComplete(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save onboarding settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseDemoMode = async () => {
    setSaving(true);
    try {
      await updateCompany({
        name: companyName,
        currency,
        data_source: 'demo',
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      });

      setDemoMode(true);
      setOnboardingComplete(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Error enabling demo mode:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enable demo mode.');
    } finally {
      setSaving(false);
    }
  };

  const isStep1Valid = companyName.trim().length > 0;
  const isStep2Valid = selectedSource !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.onboarding.title}</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Company & Currency */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold">{t.onboarding.step1.title}</h3>
              <p className="text-sm text-muted-foreground">{t.onboarding.step1.subtitle}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t.onboarding.step1.companyName}
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t.onboarding.step1.companyPlaceholder}
                  className="h-12"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t.onboarding.step1.baseCurrency}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => setCurrency(curr.code)}
                      className={`
                        p-3 rounded-lg border text-sm font-medium transition-all text-center
                        ${currency === curr.code
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <Coins className="h-4 w-4 mx-auto mb-1" />
                      {curr.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Data Source */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Database className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold">{t.onboarding.step2.title}</h3>
              <p className="text-sm text-muted-foreground">{t.onboarding.step2.subtitle}</p>
            </div>

            <div className="space-y-3">
              {dataSources.map((source) => {
                const Icon = source.icon;
                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source.id)}
                    className={`
                      w-full p-4 rounded-lg border text-left transition-all
                      ${selectedSource === source.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${selectedSource === source.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium text-foreground">{source.label}</p>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">
                {t.onboarding.step2.tip}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold">{t.onboarding.step3.title}</h3>
              <p className="text-sm text-muted-foreground">{t.onboarding.step3.subtitle}</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">{t.onboarding.step3.companyLabel}</p>
                <p className="font-medium text-foreground">{companyName}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">{t.onboarding.step3.currencyLabel}</p>
                <p className="font-medium text-foreground">
                  {t.currencies[currency]}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">{t.onboarding.step3.dataSourceLabel}</p>
                <p className="font-medium text-foreground">
                  {dataSources.find(s => s.id === selectedSource)?.label}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-foreground">
                {t.onboarding.step3.demoTip}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleUseDemoMode}
                disabled={saving}
              >
                {t.onboarding.step3.useDemoMode}
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.common.back}
            </Button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <Button 
              onClick={handleNext}
              disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
            >
              {t.common.next}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving}>
              {saving ? t.common.loading : t.common.start}
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
