import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { UserPlus2, Users } from "@/lib/icons";
import { useMetrics } from "@/hooks/useMetrics";
import { formatNumber } from "@/lib/format";
import { ChartCard } from "@/components/ui/chart-card";

type UserGrowthPoint = {
  month: string;
  period: string;
  users: number;
  change: number | null;
  previousUsers: number | null;
  previousMonth: string | null;
};

interface UserGrowthTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: UserGrowthPoint }>;
}

export function UserGrowthChart() {
  const { filteredUserMetrics, loading } = useMetrics();
  const navigate = useNavigate();

  const sortedMetrics = [...filteredUserMetrics]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const chartData: UserGrowthPoint[] = sortedMetrics.map((metric, index) => {
    const previousMetric = index > 0 ? sortedMetrics[index - 1] : null;

    return {
      month: new Date(metric.date).toLocaleDateString("en-US", { month: "short" }),
      period: new Date(metric.date).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      users: metric.total_users,
      change: previousMetric?.total_users
        ? Number((((metric.total_users - previousMetric.total_users) / previousMetric.total_users) * 100).toFixed(1))
        : null,
      previousUsers: previousMetric?.total_users ?? null,
      previousMonth: previousMetric
        ? new Date(previousMetric.date).toLocaleDateString("en-US", { month: "short" })
        : null,
    };
  });
  const previousPeriodValue = chartData.length > 1 ? chartData[chartData.length - 2].users : null;

  const UserGrowthTooltip = ({ active, payload }: UserGrowthTooltipProps) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0].payload;
    const delta = point.change;

    return (
      <div
        className="min-w-[188px] rounded-lg border border-white/15 bg-[#0f1117] px-3 py-3 text-white shadow-2xl"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        role="presentation"
      >
        <p className="text-[11px] text-white/60">{point.period}</p>
        <p className="mt-1 text-base font-semibold">Users: {formatNumber(point.users, "en-US")}</p>
        {delta !== null ? (
          <p className={`mt-1 text-xs ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs {point.previousMonth ?? "prev"}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <ChartCard
      title="User Base Trend"
      description="Total users and new users over time."
      icon={Users}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={UserPlus2}
      emptyTitle="No data yet"
      emptyDescription="Add metrics or import CSV to see your chart."
      emptyActionLabel="+ Add Metrics"
      onEmptyAction={() => navigate("/dashboard/user-growth?action=add")}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={45}
              tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString())}
            />
            <Tooltip
              cursor={{ stroke: "#ffffff1f", strokeWidth: 1 }}
              content={<UserGrowthTooltip />}
            />
            {previousPeriodValue !== null ? (
              <ReferenceLine
                y={previousPeriodValue}
                stroke="#ffffff20"
                strokeDasharray="4 4"
                label={{
                  value: "Last period",
                  position: "right",
                  fill: "#ffffff40",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="users"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#userGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#ffffff",
                stroke: "#10b981",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
