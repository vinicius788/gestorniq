import { Users, UserPlus, TrendingUp, Activity } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { FormattedNumber, FormattedPercent } from "@/components/ui/formatted-value";
import { calculateUserCadenceMetrics } from "@/lib/calculations";

export function UserGrowthMetrics() {
  const { metrics, filteredUserMetrics } = useMetrics();
  const cadence = calculateUserCadenceMetrics(filteredUserMetrics);

  const formatSignedValue = (value: number | null) => {
    if (value === null) return "—";
    const rounded = Math.round(value);
    const sign = rounded > 0 ? "+" : "";
    return (
      <span className="tabular-nums">
        {sign}
        <FormattedNumber value={rounded} />
      </span>
    );
  };

  const growthMetrics = [
    { 
      label: "Day over Day", 
      value: formatSignedValue(cadence.daily.value),
      change: cadence.daily.change,
      period: "new users / day" 
    },
    { 
      label: "Week over Week", 
      value: formatSignedValue(cadence.weekly.value),
      change: cadence.weekly.change,
      period: "new users / week" 
    },
    { 
      label: "Month over Month", 
      value: formatSignedValue(cadence.monthly.value),
      change: cadence.monthly.change,
      period: "new users / 30 days" 
    },
  ];

  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-primary/70" />
        <h3 className="text-lg font-semibold text-foreground">Growth Rates</h3>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <p className="text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.activeUsers} />
          </p>
          {metrics.userGrowth !== null ? (
            <p className="text-sm mt-1 tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign colorize /> this month
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">—</p>
          )}
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground">New this Month</span>
          </div>
          <p className="text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.newUsers} />
          </p>
          {metrics.userGrowth !== null ? (
            <p className="text-sm mt-1 tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign colorize /> vs previous
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Growth Rates */}
      <div className="space-y-3">
        {growthMetrics.map((metric) => (
          <div 
            key={metric.label}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                <TrendingUp className="h-4 w-4 text-chart-2/70" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{metric.label}</p>
              <p className="text-xs text-muted-foreground">{metric.period}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground whitespace-nowrap tabular-nums">{metric.value}</p>
              {metric.change !== null ? (
                <p className="text-sm font-medium tabular-nums">
                  <FormattedPercent value={metric.change} showSign colorize />
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
