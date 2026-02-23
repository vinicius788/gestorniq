import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ActivitySquare, TrendingUp } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { ChartCard } from "@/components/ui/chart-card";

export function GrowthChart() {
  const { filteredRevenueSnapshots, loading } = useMetrics();

  const sortedSnapshots = [...filteredRevenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const chartData = sortedSnapshots.map((snapshot, index) => {
    const prevSnapshot = sortedSnapshots[index - 1];
    const growth = prevSnapshot?.mrr ? ((snapshot.mrr - prevSnapshot.mrr) / prevSnapshot.mrr) * 100 : 0;
    return {
      month: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short" }),
      growth: Number(growth.toFixed(1)),
    };
  });

  return (
    <ChartCard
      title="Revenue Growth Rate"
      description="Month-over-month percentage change in recurring revenue."
      icon={TrendingUp}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={ActivitySquare}
      emptyTitle="No growth trend available"
      emptyDescription="Growth rate appears once at least two revenue snapshots are available."
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
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
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                color: "hsl(var(--popover-foreground))",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Growth"]}
            />
            <Bar dataKey="growth" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
