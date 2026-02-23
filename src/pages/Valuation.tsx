import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calculator, DollarSign, Info, Loader2, Save, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ChartCardSkeleton, StatCardSkeleton } from "@/components/ui/skeletons";
import { MoneyValue } from "@/components/ui/money-value";
import { FormattedPercent } from "@/components/ui/formatted-value";
import { InvestorPackActions } from "@/components/dashboard/InvestorPackActions";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { calculateSuggestedMultipleBreakdown } from "@/lib/calculations";
import { formatPercent, getGrowthLabel, type Currency } from "@/lib/format";

export default function Valuation() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { metrics, revenueSnapshots, userMetrics, valuationSnapshots, calculateValuation, loading, error } = useMetrics();
  const { isDemoMode } = useApp();
  const [saving, setSaving] = useState(false);

  const currency = (company?.currency || "USD") as Currency;
  const suggestedMultiple = metrics.suggestedMultiple;
  const [multiple, setMultiple] = useState([metrics.valuationMultiple ?? suggestedMultiple]);

  const arr = metrics.arr ?? 0;
  const valuation = arr * multiple[0];
  const minRange = arr * Math.max(1, multiple[0] - 2);
  const maxRange = arr * (multiple[0] + 2);

  useEffect(() => {
    if (metrics.valuationMultiple) {
      setMultiple([metrics.valuationMultiple]);
    }
  }, [metrics.valuationMultiple]);

  const handleSaveValuation = async () => {
    if (isDemoMode) {
      toast.error("Cannot save in demo mode");
      return;
    }

    setSaving(true);
    try {
      await calculateValuation(multiple[0]);
      toast.success("Valuation snapshot saved");
    } catch {
      toast.error("Error saving valuation");
    } finally {
      setSaving(false);
    }
  };

  const revenueGrowthLabel = getGrowthLabel(metrics.mrrGrowth);
  const userGrowthLabel = getGrowthLabel(metrics.userGrowth);
  const multipleBreakdown = useMemo(
    () => calculateSuggestedMultipleBreakdown(metrics.mrrGrowth, metrics.userGrowth),
    [metrics.mrrGrowth, metrics.userGrowth],
  );

  const assumptions = useMemo(
    () => [
      {
        label: "Base multiple",
        value: `${multipleBreakdown.baseMultiple.toFixed(1)}x ARR baseline for early-stage SaaS.`,
      },
      {
        label: "Revenue growth boost",
        value: `+${multipleBreakdown.revenueContribution.toFixed(1)}x from ${formatPercent(multipleBreakdown.revenueGrowthRate, { decimals: 2 })} MoM.`,
      },
      {
        label: "User growth boost",
        value: `+${multipleBreakdown.userContribution.toFixed(1)}x from ${formatPercent(multipleBreakdown.userGrowthRate, { decimals: 2 })} MoM.`,
      },
      {
        label: "PMF bonus",
        value: multipleBreakdown.pmfBonus > 0
          ? `+${multipleBreakdown.pmfBonus.toFixed(1)}x applied (user growth > 10% and revenue growth < 10%).`
          : "+0.0x not applied (requires user growth > 10% and revenue growth < 10%).",
      },
      {
        label: "Balance bonus",
        value: multipleBreakdown.balanceBonus > 0
          ? `+${multipleBreakdown.balanceBonus.toFixed(1)}x applied (both revenue and user growth > 5%).`
          : "+0.0x not applied (requires both revenue and user growth > 5%).",
      },
    ],
    [multipleBreakdown],
  );

  if (loading) {
    return (
      <div className="page-section animate-fade-in">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="page-section animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Build a transparent valuation narrative using ARR and traction inputs.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <InvestorPackActions
            compact
            companyName={company?.name || "My SaaS Company"}
            currency={currency}
            metrics={metrics}
            revenueSnapshots={revenueSnapshots}
            userMetrics={userMetrics}
            valuationSnapshots={valuationSnapshots}
          />
          <Button onClick={handleSaveValuation} disabled={saving || !metrics.hasRevenueData || isDemoMode}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Snapshot
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load valuation data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!metrics.hasRevenueData && !isDemoMode && (
        <EmptyState
          icon={Calculator}
          title="Add revenue data first"
          description="Valuation requires ARR history. Add revenue snapshots to unlock valuation and scenario planning."
          actionLabel="Add Revenue"
          onAction={() => navigate("/dashboard/revenue?action=add")}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard
          label="Valuation (Base)"
          value={<MoneyValue value={valuation} currency={currency} abbreviate size="2xl" />}
          delta={metrics.hasRevenueData ? metrics.mrrGrowth : null}
          deltaLabel={`${multiple[0]}x ARR`}
          icon={TrendingUp}
          empty={!metrics.hasRevenueData && !isDemoMode}
          emptyText="Requires ARR data"
        />
        <StatCard
          label="Revenue Growth"
          value={<FormattedPercent value={metrics.mrrGrowth} className="text-2xl font-bold" />}
          delta={metrics.mrrGrowth}
          deltaLabel={revenueGrowthLabel.label}
          icon={DollarSign}
          empty={!metrics.hasRevenueData && !isDemoMode}
          emptyText="Needs revenue trend"
        />
        <StatCard
          label="User Growth"
          value={<FormattedPercent value={metrics.userGrowth} className="text-2xl font-bold" />}
          delta={metrics.userGrowth}
          deltaLabel={userGrowthLabel.label}
          icon={Users}
          empty={!metrics.hasUserData && !isDemoMode}
          emptyText="Needs user trend"
        />
      </div>

      <div className="metric-card">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Valuation Range</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conservative</p>
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
              <MoneyValue value={minRange} currency={currency} abbreviate size="2xl" />
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Base Case</p>
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
              <MoneyValue value={valuation} currency={currency} abbreviate size="2xl" />
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upside</p>
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
              <MoneyValue value={maxRange} currency={currency} abbreviate size="2xl" />
            </p>
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="mb-5 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Revenue Forecast (3/6/12 Months)</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "3 months", forecast: metrics.forecast3m },
            { label: "6 months", forecast: metrics.forecast6m },
            { label: "12 months", forecast: metrics.forecast12m },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Projected MRR</span>
                  <MoneyValue value={item.forecast?.mrr ?? null} currency={currency} size="sm" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Projected ARR</span>
                  <MoneyValue value={item.forecast?.arr ?? null} currency={currency} size="sm" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Projected valuation</span>
                  <MoneyValue value={item.forecast?.valuation ?? null} currency={currency} abbreviate size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="metric-card">
          <div className="mb-6 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Valuation Calculator</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Annual Recurring Revenue (ARR)</label>
              <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4">
                <MoneyValue value={metrics.arr} currency={currency} size="2xl" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Revenue Multiple</label>
                <span className="text-lg font-semibold text-primary">{multiple[0]}x</span>
              </div>
              <Slider value={multiple} onValueChange={setMultiple} min={1} max={40} step={0.5} className="w-full" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>1x</span>
                <span>20x</span>
                <span>40x</span>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setMultiple([suggestedMultiple])}>
                Reset to Suggested ({suggestedMultiple}x)
              </Button>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">Calculated Valuation</p>
              <MoneyValue value={valuation} currency={currency} size="3xl" className="mt-1" />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="mb-6 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">How the Multiple Is Calculated</h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The model combines revenue growth and user growth to produce a grounded multiple.
            </p>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <ul className="space-y-3">
                {assumptions.map((assumption) => (
                  <li key={assumption.label}>
                    <p className="text-sm font-semibold text-foreground">{assumption.label}</p>
                    <p className="text-sm text-muted-foreground">{assumption.value}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-chart-2/40 bg-chart-2/10 p-4">
              <p className="text-sm font-semibold text-foreground">Suggested Multiple</p>
              <p className="mt-1 text-lg font-semibold text-primary">{suggestedMultiple}x ARR</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {multipleBreakdown.baseMultiple.toFixed(1)} + {multipleBreakdown.revenueContribution.toFixed(1)} + {multipleBreakdown.userContribution.toFixed(1)} + {multipleBreakdown.pmfBonus.toFixed(1)} + {multipleBreakdown.balanceBonus.toFixed(1)} = {multipleBreakdown.totalMultiple.toFixed(1)}x
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Revenue: {revenueGrowthLabel.symbol} {revenueGrowthLabel.label} · User: {userGrowthLabel.symbol} {userGrowthLabel.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
