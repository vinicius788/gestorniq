import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart, Wallet } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { ChartCard } from "@/components/ui/chart-card";
import { CURRENCY_CONFIG, type Currency } from "@/lib/format";

export function RevenueChart() {
  const { filteredRevenueSnapshots, loading } = useMetrics();
  const { company } = useCompany();

  const currency = (company?.currency || "USD") as Currency;
  const config = CURRENCY_CONFIG[currency];

  const chartData = [...filteredRevenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12)
    .map((snapshot) => ({
      month: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short" }),
      mrr: snapshot.mrr,
    }));

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${config.symbol}${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${config.symbol}${(value / 1_000).toFixed(0)}K`;
    return `${config.symbol}${value}`;
  };

  const formatTooltipValue = (value: number) =>
    new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <ChartCard
      title="MRR Trend"
      description="Monthly recurring revenue performance over the selected period."
      icon={LineChart}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={Wallet}
      emptyTitle="No revenue data yet"
      emptyDescription="Add revenue snapshots to visualize MRR trend and momentum."
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.34} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={formatYAxis}
              width={60}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                color: "hsl(var(--popover-foreground))",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatTooltipValue(value), "MRR"]}
            />
            <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#mrrGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
