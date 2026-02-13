import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { CURRENCY_CONFIG, type Currency } from "@/lib/format";

export function RevenueChart() {
  const { revenueSnapshots } = useMetrics();
  const { company } = useCompany();
  
  const currency = (company?.currency || 'USD') as Currency;
  const config = CURRENCY_CONFIG[currency];

  // Prepare chart data (sort by date ascending)
  const chartData = [...revenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12) // Last 12 points
    .map(snapshot => ({
      month: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short' }),
      mrr: snapshot.mrr,
    }));

  if (chartData.length === 0) {
    return (
      <div className="metric-card overflow-hidden">
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground">MRR Growth</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Monthly Recurring Revenue over time</p>
        </div>
        <div className="h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No data to display</p>
        </div>
      </div>
    );
  }

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) {
      return `${config.symbol}${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${config.symbol}${(value / 1_000).toFixed(0)}K`;
    }
    return `${config.symbol}${value}`;
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="metric-card overflow-hidden">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground">MRR Growth</h3>
        <p className="text-xs md:text-sm text-muted-foreground">Monthly Recurring Revenue over time</p>
      </div>
      <div className="h-[200px] sm:h-[250px] md:h-[300px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              tickFormatter={formatYAxis}
              width={55}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(222 47% 8%)',
                border: '1px solid hsl(217 33% 17%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)',
                fontSize: '12px'
              }}
              formatter={(value: number) => [formatTooltipValue(value), 'MRR']}
            />
            <Area
              type="monotone"
              dataKey="mrr"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              fill="url(#mrrGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
