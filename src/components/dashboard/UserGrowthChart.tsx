import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UserPlus2, Users } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { formatNumber } from "@/lib/format";
import { ChartCard } from "@/components/ui/chart-card";

export function UserGrowthChart() {
  const { filteredUserMetrics, loading } = useMetrics();

  const chartData = [...filteredUserMetrics]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12)
    .map((metric) => ({
      month: new Date(metric.date).toLocaleDateString("en-US", { month: "short" }),
      users: metric.total_users,
      newUsers: metric.new_users,
    }));

  return (
    <ChartCard
      title="User Base Trend"
      description="Total users and new users over time."
      icon={Users}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={UserPlus2}
      emptyTitle="No user history yet"
      emptyDescription="Add user metrics to unlock growth visuals and trend analysis."
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="6%" stopColor="hsl(var(--chart-2))" stopOpacity={0.34} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
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
              width={56}
              tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString())}
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
              formatter={(value: number, name: string) => [
                formatNumber(value, "en-US"),
                name === "users" ? "Total Users" : "New Users",
              ]}
            />
            <Area type="monotone" dataKey="users" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#userGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
