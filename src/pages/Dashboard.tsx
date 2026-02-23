import { useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, DollarSign, Target, TrendingUp, Users } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { MoneyValue } from "@/components/ui/money-value";
import { FormattedPercent } from "@/components/ui/formatted-value";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChartCardSkeleton, StatCardSkeleton } from "@/components/ui/skeletons";
import { InvestorPackActions } from "@/components/dashboard/InvestorPackActions";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import type { Currency } from "@/lib/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const { company, loading: companyLoading } = useCompany();
  const { metrics, revenueSnapshots, userMetrics, valuationSnapshots, loading: metricsLoading, error } = useMetrics();
  const { isDemoMode } = useApp();

  const loading = companyLoading || metricsLoading;
  const currency = (company?.currency || "USD") as Currency;

  if (loading) {
    return (
      <div className="page-section animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
        <ChartCardSkeleton />
      </div>
    );
  }

  const { hasData, hasRevenueData, hasUserData } = metrics;

  return (
    <div className="page-section animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h2 className="text-xl font-semibold text-foreground">{company?.name || "Your SaaS company"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isDemoMode && <Badge variant="secondary">Demo data</Badge>}
          <Badge variant={hasData ? "default" : "outline"}>{hasData ? "Active metrics" : "No metrics yet"}</Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load metrics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasData && !isDemoMode && (
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Add your first revenue and user snapshots to unlock the dashboard."
          actionLabel="Add revenue"
          onAction={() => navigate("/dashboard/revenue?action=add")}
        />
      )}

      <div className="metric-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Investor Pack</p>
            <p className="text-sm text-muted-foreground">
              Export a board-ready summary with your metrics, forecasts, and latest snapshots.
            </p>
          </div>
          <InvestorPackActions
            compact
            companyName={company?.name || "My SaaS Company"}
            currency={currency}
            metrics={metrics}
            revenueSnapshots={revenueSnapshots}
            userMetrics={userMetrics}
            valuationSnapshots={valuationSnapshots}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={<MoneyValue value={metrics.mrr} currency={currency} size="2xl" />}
          delta={hasRevenueData ? metrics.mrrGrowth : null}
          deltaLabel="vs previous period"
          icon={DollarSign}
          empty={!hasRevenueData}
          emptyText="Add revenue snapshots"
        />
        <StatCard
          label="ARR"
          value={<MoneyValue value={metrics.arr} currency={currency} size="2xl" />}
          delta={hasRevenueData ? metrics.mrrGrowth : null}
          deltaLabel="annualized from MRR"
          icon={BarChart3}
          empty={!hasRevenueData}
          emptyText="Add revenue snapshots"
        />
        <StatCard
          label="Net New MRR"
          value={<MoneyValue value={metrics.netNewMrr} currency={currency} size="2xl" />}
          delta={hasRevenueData ? metrics.mrrGrowth : null}
          deltaLabel="new + expansion - churn"
          icon={TrendingUp}
          empty={!hasRevenueData}
          emptyText="Add revenue movement data"
        />
        <StatCard
          label="Valuation"
          value={<MoneyValue value={metrics.valuation} currency={currency} abbreviate size="2xl" />}
          delta={hasRevenueData ? metrics.mrrGrowth : null}
          deltaLabel={metrics.valuationMultiple ? `${metrics.valuationMultiple}x ARR` : undefined}
          icon={Target}
          empty={!hasRevenueData}
          emptyText="Requires ARR data"
        />
      </div>

      <div className="metric-card">
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground">Revenue Forecast</p>
          <p className="text-sm text-muted-foreground">
            3, 6, and 12-month projections based on your latest growth trend.
          </p>
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
        <RevenueChart />
        <GrowthChart />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Users"
          value={metrics.totalUsers?.toLocaleString("en-US")}
          delta={hasUserData ? metrics.userGrowth : null}
          deltaLabel="month over month"
          icon={Users}
          empty={!hasUserData}
          emptyText="Add user snapshots"
        />
        <StatCard
          label="Churn Rate"
          value={<FormattedPercent value={metrics.churnRate} className="text-2xl font-bold" />}
          delta={hasUserData ? -Math.abs(metrics.churnRate ?? 0) : null}
          deltaLabel="lower is better"
          icon={TrendingUp}
          empty={!hasUserData}
          emptyText="Needs user activity data"
        />
        <StatCard
          label="ARPU"
          value={<MoneyValue value={metrics.arpu} currency={currency} size="2xl" />}
          delta={null}
          deltaLabel="average revenue per user"
          icon={DollarSign}
          empty={!hasRevenueData || !hasUserData}
          emptyText="Requires revenue + users"
        />
      </div>

      <UserGrowthChart />
    </div>
  );
}
