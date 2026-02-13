import { Users, UserPlus, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMetrics } from "@/hooks/useMetrics";
import { FormattedNumber, FormattedPercent } from "@/components/ui/formatted-value";

export function UserGrowthMetrics() {
  const { metrics, userMetrics } = useMetrics();

  // Calculate growth metrics if data exists
  const hasData = userMetrics.length >= 2;
  
  // Current and previous data
  const current = userMetrics[0];
  const previous = userMetrics[1];
  
  // Daily growth (approximated)
  const dailyGrowth = hasData && previous ? {
    value: Math.round((current.new_users - previous.new_users) / 30),
    change: previous.new_users > 0 
      ? ((current.new_users - previous.new_users) / previous.new_users) * 100 
      : 0,
  } : null;

  // Weekly growth (approximated)
  const weeklyGrowth = hasData && previous ? {
    value: Math.round((current.new_users - previous.new_users) / 4),
    change: previous.new_users > 0 
      ? ((current.new_users - previous.new_users) / previous.new_users) * 100 
      : 0,
  } : null;

  // Monthly growth
  const monthlyGrowth = hasData && previous ? {
    value: current.new_users,
    change: previous.new_users > 0 
      ? ((current.new_users - previous.new_users) / previous.new_users) * 100 
      : 0,
  } : null;

  const growthMetrics = [
    { 
      label: "Day over Day", 
      value: dailyGrowth ? `+${dailyGrowth.value}` : '—',
      change: dailyGrowth?.change ?? null, 
      period: "avg per day" 
    },
    { 
      label: "Week over Week", 
      value: weeklyGrowth ? `+${weeklyGrowth.value}` : '—',
      change: weeklyGrowth?.change ?? null, 
      period: "avg per week" 
    },
    { 
      label: "Month over Month", 
      value: monthlyGrowth ? (
        <span className="tabular-nums">+<FormattedNumber value={monthlyGrowth.value} /></span>
      ) : '—',
      change: monthlyGrowth?.change ?? null, 
      period: "vs previous month" 
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
