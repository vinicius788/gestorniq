import { useState } from "react";
import { Calculator, PieChart, DollarSign, Loader2 } from "lucide-react";
import { MoneyValue } from "@/components/ui/money-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { calculateEquityValue } from "@/lib/calculations";
import type { Currency } from "@/lib/format";

const equityOptions = [
  { percentage: 5, label: "5%" },
  { percentage: 10, label: "10%" },
  { percentage: 15, label: "15%" },
  { percentage: 20, label: "20%" },
  { percentage: 25, label: "25%" },
];

export default function EquityCalculator() {
  const { company } = useCompany();
  const { metrics, loading } = useMetrics();
  const { isDemoMode } = useApp();
  const [selectedPercentage, setSelectedPercentage] = useState(10);
  const [customPercentage, setCustomPercentage] = useState("");
  const [totalShares, setTotalShares] = useState("10000000");

  const currency = (company?.currency || 'USD') as Currency;
  const activePercentage = customPercentage ? parseFloat(customPercentage) : selectedPercentage;
  const parsedShares = Math.max(0, parseInt(totalShares.replace(/[^\d]/g, ""), 10) || 0);
  
  const { value: equityValue, usedValuation } = calculateEquityValue(
    metrics.valuation,
    metrics.arr,
    activePercentage
  );
  const sharePrice = parsedShares > 0 ? usedValuation / parsedShares : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = metrics.hasRevenueData || isDemoMode;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Equity Calculator</h1>
        <p className="text-muted-foreground">
          Calculate equity value for investors or team members
          {isDemoMode && <span className="ml-2 text-warning">(Demo Mode)</span>}
        </p>
      </div>

      {!hasData && (
        <div className="metric-card p-8 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Add data first</h2>
          <p className="text-muted-foreground mb-4">
            To calculate equity, you need a valuation. Add revenue data first.
          </p>
          <a href="/dashboard/revenue" className="text-primary hover:underline font-medium">
            Add Revenue →
          </a>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calculator */}
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-primary/70" />
            <h3 className="text-lg font-semibold text-foreground">Select Equity Percentage</h3>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {equityOptions.map((option) => (
              <button
                key={option.percentage}
                onClick={() => {
                  setSelectedPercentage(option.percentage);
                  setCustomPercentage("");
                }}
                className={`p-3 rounded-lg border text-sm font-medium transition-all tabular-nums ${
                  selectedPercentage === option.percentage && !customPercentage
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Or enter a custom percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={customPercentage}
                onChange={(e) => setCustomPercentage(e.target.value)}
                placeholder="Enter percentage"
                min="0"
                max="100"
                step="0.1"
                className="w-full h-12 rounded-lg border border-border bg-muted/50 px-4 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border mb-4">
            <p className="text-sm text-muted-foreground">
              Current Valuation ({metrics.valuationMultiple ?? 10}x ARR)
            </p>
            <div className="text-2xl font-bold text-foreground">
              {hasData ? <MoneyValue value={usedValuation} currency={currency} abbreviate size="2xl" /> : '—'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Total diluted shares outstanding
            </label>
            <input
              type="number"
              value={totalShares}
              onChange={(e) => setTotalShares(e.target.value)}
              min="1"
              step="1"
              className="w-full h-12 rounded-lg border border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Implied share price:{" "}
              <span className="font-semibold text-foreground">
                {hasData ? <MoneyValue value={sharePrice} currency={currency} size="sm" /> : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Result */}
        <div className="metric-card relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="h-5 w-5 text-primary/70" />
              <h3 className="text-lg font-semibold text-foreground">Equity Value</h3>
            </div>

            <div className="text-center py-8">
              <p className="text-6xl font-bold gradient-text mb-2 tabular-nums">
                {activePercentage || 0}%
              </p>
              <p className="text-muted-foreground mb-6">ownership stake</p>

              <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-primary/70" />
                  <span className="text-sm text-muted-foreground">Value</span>
                </div>
                <div className="text-4xl font-bold text-foreground">
                  {hasData ? <MoneyValue value={equityValue} currency={currency} size="4xl" /> : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Post-Money Cap</p>
                <div className="text-lg font-semibold text-foreground">
                  {hasData ? <MoneyValue value={usedValuation} currency={currency} abbreviate size="lg" /> : '—'}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Investment Value</p>
                <div className="text-lg font-semibold text-foreground">
                  {hasData ? <MoneyValue value={equityValue} currency={currency} size="lg" /> : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="metric-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Reference</h3>
        <div className="grid gap-4 md:grid-cols-4">
          {[5, 10, 15, 20].map((pct) => {
            const { value } = calculateEquityValue(metrics.valuation, metrics.arr, pct);
            return (
              <div key={pct} className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-primary tabular-nums">{pct}%</p>
                <div className="text-sm text-muted-foreground mt-1">
                  {hasData ? <MoneyValue value={value} currency={currency} size="sm" /> : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment Scenarios */}
      <div className="metric-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Investment Scenarios</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Round</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Typical Equity</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Value at Current Valuation</th>
              </tr>
            </thead>
            <tbody>
              {[
                { round: "Angel/Pre-Seed", equity: "10-20%", typical: 15 },
                { round: "Seed", equity: "15-25%", typical: 20 },
                { round: "Series A", equity: "15-30%", typical: 22 },
                { round: "Employee Pool", equity: "10-15%", typical: 12 },
                { round: "Advisor", equity: "0.5-2%", typical: 1 },
              ].map((scenario) => {
                const { value } = calculateEquityValue(metrics.valuation, metrics.arr, scenario.typical);
                return (
                  <tr key={scenario.round} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2 text-sm text-foreground font-medium">{scenario.round}</td>
                    <td className="py-3 px-2 text-sm text-muted-foreground text-right tabular-nums">{scenario.equity}</td>
                    <td className="py-3 px-2 text-sm text-foreground text-right font-medium">
                      {hasData ? <MoneyValue value={value} currency={currency} size="sm" /> : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
