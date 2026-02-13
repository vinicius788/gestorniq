import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMetrics } from "@/hooks/useMetrics";

export function GrowthChart() {
  const { revenueSnapshots } = useMetrics();

  // Calculate month-over-month growth
  const sortedSnapshots = [...revenueSnapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const chartData = sortedSnapshots.map((snapshot, index) => {
    const prevSnapshot = sortedSnapshots[index - 1];
    const growth = prevSnapshot?.mrr > 0
      ? ((snapshot.mrr - prevSnapshot.mrr) / prevSnapshot.mrr) * 100
      : 0;
    
    return {
      month: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short' }),
      growth: Math.round(growth * 10) / 10,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="metric-card overflow-hidden">
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Growth Rate</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Month-over-month revenue growth</p>
        </div>
        <div className="h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card overflow-hidden">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground">Growth Rate</h3>
        <p className="text-xs md:text-sm text-muted-foreground">Month-over-month revenue growth</p>
      </div>
      <div className="h-[200px] sm:h-[250px] md:h-[300px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              tickFormatter={(value) => `${value}%`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(222 47% 8%)',
                border: '1px solid hsl(217 33% 17%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)',
                fontSize: '12px'
              }}
              formatter={(value: number) => [`${value}%`, 'Growth']}
            />
            <Bar
              dataKey="growth"
              fill="hsl(217 91% 60%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
