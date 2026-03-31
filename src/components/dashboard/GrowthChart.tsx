import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { ActivitySquare, TrendingUp } from "@/lib/icons";
import { useMetrics } from "@/hooks/useMetrics";
import { ChartCard } from "@/components/ui/chart-card";

type GrowthPoint = {
  month: string;
  growth: number;
};

interface GrowthTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GrowthPoint }>;
}

export function GrowthChart() {
  const { filteredRevenueSnapshots, loading } = useMetrics();
  const navigate = useNavigate();

  const sortedSnapshots = [...filteredRevenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const chartData: GrowthPoint[] = sortedSnapshots.map((snapshot, index) => {
    const prevSnapshot = sortedSnapshots[index - 1];
    const growth = prevSnapshot?.mrr ? ((snapshot.mrr - prevSnapshot.mrr) / prevSnapshot.mrr) * 100 : 0;
    return {
      month: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short" }),
      growth: Number(growth.toFixed(1)),
    };
  });

  const GrowthTooltip = ({ active, payload }: GrowthTooltipProps) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0].payload;

    return (
      <div
        className="min-w-[160px] rounded-lg border border-white/15 bg-[#0f1117] px-3 py-3 text-white shadow-2xl"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        role="presentation"
      >
        <p className="text-[11px] text-white/60">{point.month}</p>
        <p className={`mt-1 text-base font-semibold ${point.growth >= 0 ? "text-[#3B82F6]" : "text-[#ef4444]"}`}>
          {point.growth >= 0 ? "+" : ""}
          {point.growth}%
        </p>
      </div>
    );
  };

  return (
    <ChartCard
      title="Revenue Growth Rate"
      description="Month-over-month percentage change in recurring revenue."
      icon={TrendingUp}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={ActivitySquare}
      emptyTitle="No data yet"
      emptyDescription="Add metrics or import CSV to see your chart."
      emptyActionLabel="+ Add Metrics"
      onEmptyAction={() => navigate("/dashboard/revenue?action=add")}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }} barSize={8} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#ffffff66", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#ffffff66", fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "#ffffff0a" }}
              content={<GrowthTooltip />}
            />
            <Bar dataKey="growth" radius={[4, 4, 0, 0]} fill="#3B82F6">
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.month}-${index}`}
                  fill={entry.growth >= 0 ? "#3B82F6" : "#ef4444"}
                  fillOpacity={index === chartData.length - 1 ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
