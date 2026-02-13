import { DollarSign, TrendingUp, BarChart3, Target, Users, UserPlus, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { MoneyValue } from "@/components/ui/money-value";
import { FormattedNumber, FormattedPercent } from "@/components/ui/formatted-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Currency } from "@/lib/format";

export default function Dashboard() {
  const { company, loading: companyLoading } = useCompany();
  const { metrics, loading: metricsLoading } = useMetrics();
  const { isDemoMode } = useApp();
  const { t } = useLanguage();

  const loading = companyLoading || metricsLoading;
  const currency = (company?.currency || 'USD') as Currency;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { hasData, hasRevenueData, hasUserData } = metrics;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t.dashboard.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {company?.name || 'Your SaaS'} — {t.dashboard.subtitle}
            {isDemoMode && <span className="ml-2 text-warning">{t.dashboard.demoMode}</span>}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && !isDemoMode && (
        <div className="metric-card p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{t.dashboard.emptyState.title}</h2>
          <p className="text-muted-foreground mb-4">
            {t.dashboard.emptyState.description}
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/dashboard/revenue" className="text-primary hover:underline font-medium">
              {t.dashboard.emptyState.addRevenue}
            </a>
            <a href="/dashboard/user-growth" className="text-primary hover:underline font-medium">
              {t.dashboard.emptyState.addUsers}
            </a>
          </div>
        </div>
      )}

      {/* Revenue Metrics Grid */}
      <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t.dashboard.metrics.mrr}
          value={<MoneyValue value={metrics.mrr} currency={currency} size="3xl" />}
          change={hasRevenueData ? metrics.mrrGrowth : undefined}
          icon={DollarSign}
        />
        <MetricCard
          title={t.dashboard.metrics.arr}
          value={<MoneyValue value={metrics.arr} currency={currency} size="3xl" />}
          change={hasRevenueData ? metrics.mrrGrowth : undefined}
          icon={BarChart3}
        />
        <MetricCard
          title={t.dashboard.metrics.mrrGrowth}
          value={<FormattedPercent value={metrics.mrrGrowth} className="text-2xl lg:text-3xl font-bold" />}
          change={hasRevenueData ? metrics.mrrGrowth : undefined}
          changeLabel={`${t.dashboard.metrics.vsPrevious}`}
          icon={TrendingUp}
        />
        <MetricCard
          title={t.dashboard.metrics.valuation}
          value={<MoneyValue value={metrics.valuation} currency={currency} abbreviate size="3xl" />}
          change={hasRevenueData ? metrics.mrrGrowth : undefined}
          changeLabel={metrics.valuationMultiple ? `${t.dashboard.metrics.atMultiple} ${metrics.valuationMultiple}x ARR` : undefined}
          icon={Target}
        />
      </div>

      {/* User Growth Metrics */}
      <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="metric-card overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 shrink-0 text-chart-2/70" />
            <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.totalUsers}</h3>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.totalUsers} />
          </p>
          {hasUserData && metrics.userGrowth !== null ? (
            <p className="mt-1 text-sm tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign colorize /> {t.dashboard.metrics.mom}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 shrink-0 text-chart-2/70" />
            <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.newUsers}</h3>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.newUsers} />
          </p>
          {hasUserData && metrics.userGrowth !== null ? (
            <p className="mt-1 text-sm text-success tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign /> {t.dashboard.metrics.vsPrevious}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card overflow-hidden sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-chart-2/70" />
            <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.growthRate}</h3>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedPercent value={metrics.userGrowth} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.metrics.mom}</p>
        </div>
      </div>

      {/* Charts */}
      {hasData && (
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <RevenueChart />
          <GrowthChart />
        </div>
      )}

      {/* User Growth Chart */}
      {hasData && <UserGrowthChart />}

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="metric-card overflow-hidden">
          <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.activeCustomers}</h3>
          <p className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.activeUsers} />
          </p>
          {hasUserData && metrics.newUsers !== null ? (
            <p className="mt-1 text-sm text-success tabular-nums">
              +<FormattedNumber value={metrics.newUsers} /> {t.dashboard.metrics.thisMonth}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card overflow-hidden">
          <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.churnRate}</h3>
          <p className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedPercent value={metrics.churnRate} />
          </p>
          {hasUserData && metrics.churnRate !== null ? (
            <p className={`mt-1 text-sm ${metrics.churnRate < 5 ? 'text-success' : 'text-destructive'}`}>
              {metrics.churnRate < 5 ? t.common.healthy : t.common.attention}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card overflow-hidden sm:col-span-2 md:col-span-1">
          <h3 className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.metrics.arpu}</h3>
          <p className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <MoneyValue value={metrics.arpu} currency={currency} size="2xl" />
          </p>
          {hasData && metrics.arpu !== null ? (
            <p className="mt-1 text-sm text-muted-foreground whitespace-nowrap">
              {t.dashboard.metrics.estimatedLtv}: <MoneyValue value={metrics.arpu * 24} currency={currency} size="sm" />
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
