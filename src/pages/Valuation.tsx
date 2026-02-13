import { useState, useEffect } from "react";
import { TrendingUp, Calculator, Info, Users, DollarSign, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MoneyValue } from "@/components/ui/money-value";
import { FormattedPercent } from "@/components/ui/formatted-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { getGrowthLabel, type Currency } from "@/lib/format";

export default function Valuation() {
  const { company } = useCompany();
  const { metrics, calculateValuation, loading } = useMetrics();
  const { isDemoMode } = useApp();
  const [saving, setSaving] = useState(false);

  const currency = (company?.currency || 'USD') as Currency;
  const suggestedMultiple = metrics.suggestedMultiple;
  const [multiple, setMultiple] = useState([metrics.valuationMultiple ?? suggestedMultiple]);
  
  const arr = metrics.arr ?? 0;
  const valuation = arr * multiple[0];

  useEffect(() => {
    if (metrics.valuationMultiple) {
      setMultiple([metrics.valuationMultiple]);
    }
  }, [metrics.valuationMultiple]);

  const handleSaveValuation = async () => {
    if (isDemoMode) {
      toast.error('Cannot save in demo mode');
      return;
    }
    
    setSaving(true);
    try {
      await calculateValuation(multiple[0]);
      toast.success('Valuation saved!');
    } catch (error) {
      toast.error('Error saving valuation');
    } finally {
      setSaving(false);
    }
  };

  const revenueGrowthLabel = getGrowthLabel(metrics.mrrGrowth);
  const userGrowthLabel = getGrowthLabel(metrics.userGrowth);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Valuation</h1>
          <p className="text-muted-foreground">
            Calculate the estimated value of {company?.name || 'your startup'} based on revenue and growth
            {isDemoMode && <span className="ml-2 text-warning">(Demo Mode)</span>}
          </p>
        </div>
        <Button onClick={handleSaveValuation} disabled={saving || !metrics.hasRevenueData || isDemoMode}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Snapshot
        </Button>
      </div>

      {!metrics.hasRevenueData && !isDemoMode && (
        <div className="metric-card p-8 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Add data first</h2>
          <p className="text-muted-foreground mb-4">
            To calculate valuation, you need to add revenue data.
          </p>
          <a href="/dashboard/revenue" className="text-primary hover:underline font-medium">
            Add Revenue →
          </a>
        </div>
      )}

      {/* Valuation Card */}
      <div className="metric-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary/70" />
            <span className="text-sm font-medium text-muted-foreground">Estimated Valuation</span>
          </div>
          <div className="text-5xl font-bold gradient-text mb-2">
            {metrics.hasRevenueData || isDemoMode ? (
              <MoneyValue value={valuation} currency={currency} abbreviate size="5xl" />
            ) : '—'}
          </div>
          <p className="text-muted-foreground">
            {metrics.hasRevenueData || isDemoMode ? `Based on ${multiple[0]}x ARR` : 'No data'}
          </p>
        </div>
      </div>

      {/* Traction Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary/70" />
            <h3 className="font-semibold text-foreground">Revenue Growth</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-foreground whitespace-nowrap tabular-nums">
              <FormattedPercent value={metrics.mrrGrowth} />
            </span>
            <span className="text-muted-foreground mb-1">MoM</span>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(Math.abs(metrics.mrrGrowth ?? 0) * 3, 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {revenueGrowthLabel.emoji} {revenueGrowthLabel.label}
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-chart-2/70" />
            <h3 className="font-semibold text-foreground">User Growth</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-foreground whitespace-nowrap tabular-nums">
              <FormattedPercent value={metrics.userGrowth} />
            </span>
            <span className="text-muted-foreground mb-1">MoM</span>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-chart-2 rounded-full transition-all"
              style={{ width: `${Math.min(Math.abs(metrics.userGrowth ?? 0) * 3, 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {userGrowthLabel.emoji} {userGrowthLabel.label}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calculator */}
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-primary/70" />
            <h3 className="text-lg font-semibold text-foreground">Valuation Calculator</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Annual Recurring Revenue (ARR)
              </label>
              <div className="mt-2 p-4 rounded-lg bg-muted/50 border border-border">
                <MoneyValue value={metrics.arr} currency={currency} size="2xl" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Revenue Multiple
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary tabular-nums">{multiple[0]}x</span>
                  {multiple[0] === suggestedMultiple && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">
                      Suggested
                    </span>
                  )}
                </div>
              </div>
              <Slider
                value={multiple}
                onValueChange={setMultiple}
                min={1}
                max={40}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground tabular-nums">
                <span>1x</span>
                <span>20x</span>
                <span>40x</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setMultiple([suggestedMultiple])}
              >
                Reset to Suggested ({suggestedMultiple}x)
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Calculated Valuation</p>
              <MoneyValue value={valuation} currency={currency} size="3xl" className="mt-1" />
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-6">
            <Info className="h-5 w-5 text-primary/70" />
            <h3 className="text-lg font-semibold text-foreground">Combined Valuation Model</h3>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Our model considers <strong className="text-foreground">revenue and user growth</strong> to calculate a more accurate multiple, similar to VC analysis.
            </p>
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="font-medium text-foreground mb-3">How the Multiple is Calculated:</p>
              <ul className="space-y-2 list-disc list-inside text-xs">
                <li><strong className="text-foreground">Base:</strong> 5x ARR starting point</li>
                <li><strong className="text-foreground">Revenue Growth:</strong> +{Math.min((metrics.mrrGrowth ?? 0) / 6, 5).toFixed(1)}x from <FormattedPercent value={metrics.mrrGrowth} /> MoM</li>
                <li><strong className="text-foreground">User Growth:</strong> +{Math.min((metrics.userGrowth ?? 0) / 6, 5).toFixed(1)}x from <FormattedPercent value={metrics.userGrowth} /> MoM</li>
                {(metrics.userGrowth ?? 0) > 10 && (metrics.mrrGrowth ?? 0) < 10 && (
                  <li><strong className="text-success">PMF Bonus:</strong> +2x (high user growth signal)</li>
                )}
                {(metrics.mrrGrowth ?? 0) > 5 && (metrics.userGrowth ?? 0) > 5 && (
                  <li><strong className="text-success">Balance Bonus:</strong> +1x (both metrics healthy)</li>
                )}
              </ul>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
              <p className="font-medium text-foreground mb-2">🎯 Your Traction Score</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Revenue Traction</span>
                  <span className="text-foreground">{revenueGrowthLabel.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Traction</span>
                  <span className="text-foreground">{userGrowthLabel.label}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-border mt-2">
                  <span>Suggested Multiple</span>
                  <span className="text-primary tabular-nums">{suggestedMultiple}x ARR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
