import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMetrics } from "@/hooks/useMetrics";
import { formatNumber } from "@/lib/format";

export function UserGrowthChart() {
  const { userMetrics } = useMetrics();

  // Prepare chart data (sort by date ascending)
  const chartData = [...userMetrics]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12) // Last 12 points
    .map(metric => ({
      month: new Date(metric.date).toLocaleDateString('en-US', { month: 'short' }),
      users: metric.total_users,
      newUsers: metric.new_users,
    }));

  if (chartData.length === 0) {
    return (
      <div className="metric-card overflow-hidden">
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground">User Growth</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Total users and new signups</p>
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
        <h3 className="text-base md:text-lg font-semibold text-foreground">User Growth</h3>
        <p className="text-xs md:text-sm text-muted-foreground">Total users over time</p>
      </div>
      <div className="h-[200px] sm:h-[250px] md:h-[300px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173 80% 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
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
              width={50}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toString()}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(222 47% 8%)',
                border: '1px solid hsl(217 33% 17%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => [
                formatNumber(value, 'en-US'), 
                name === 'users' ? 'Total Users' : 'New Users'
              ]}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="hsl(173 80% 40%)"
              strokeWidth={2}
              fill="url(#userGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
