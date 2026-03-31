import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { LineChart, Wallet } from "@/lib/icons";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { ChartCard } from "@/components/ui/chart-card";
import { CURRENCY_CONFIG, type Currency } from "@/lib/format";

type RevenuePoint = {
  month: string;
  period: string;
  mrr: number;
  change: number | null;
  previousMrr: number | null;
  previousMonth: string | null;
};

interface RevenueTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RevenuePoint }>;
}

export function RevenueChart() {
  const { filteredRevenueSnapshots, loading } = useMetrics();
  const { company } = useCompany();
  const navigate = useNavigate();

  const currency = (company?.currency || "USD") as Currency;
  const config = CURRENCY_CONFIG[currency];

  const sortedSnapshots = [...filteredRevenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const chartData: RevenuePoint[] = sortedSnapshots.map((snapshot, index) => {
    const previousSnapshot = index > 0 ? sortedSnapshots[index - 1] : null;

    return {
      month: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short" }),
      period: new Date(snapshot.date).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      mrr: snapshot.mrr,
      change: previousSnapshot?.mrr
        ? Number((((snapshot.mrr - previousSnapshot.mrr) / previousSnapshot.mrr) * 100).toFixed(1))
        : null,
      previousMrr: previousSnapshot?.mrr ?? null,
      previousMonth: previousSnapshot
        ? new Date(previousSnapshot.date).toLocaleDateString("en-US", { month: "short" })
        : null,
    };
  });

  const previousPeriodValue = chartData.length > 1 ? chartData[chartData.length - 2].mrr : null;

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

  const RevenueTooltip = ({ active, payload }: RevenueTooltipProps) => {
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
        <p className="mt-1 text-base font-semibold">{formatTooltipValue(point.mrr)}</p>
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
      title="MRR Trend"
      description="Monthly recurring revenue performance over the selected period."
      icon={LineChart}
      loading={loading}
      isEmpty={chartData.length === 0}
      emptyIcon={Wallet}
      emptyTitle="No data yet"
      emptyDescription="Add metrics or import CSV to see your chart."
      emptyActionLabel="+ Add Metrics"
      onEmptyAction={() => navigate("/dashboard/revenue?action=add")}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
              tickFormatter={formatYAxis}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: "#ffffff1f", strokeWidth: 1 }}
              content={<RevenueTooltip />}
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
              dataKey="mrr"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#mrrGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#ffffff",
                stroke: "#3B82F6",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
