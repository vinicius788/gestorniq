import { useApp } from '@/contexts/AppContext';
import type { Timeframe } from '@/lib/calculations';
import { timeframeLabels } from '@/lib/formatters';

const timeframes: Timeframe[] = ['30d', '90d', '12m', 'all'];

const shortLabels: Record<Timeframe, string> = {
  '30d': '30d',
  '90d': '90d',
  '12m': '12m',
  'all': 'Tudo',
};

export function TimeframeSelector() {
  const { timeframe, setTimeframe } = useApp();

  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf)}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-md transition-all
            ${timeframe === tf
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }
          `}
          title={timeframeLabels[tf]}
        >
          {shortLabels[tf]}
        </button>
      ))}
    </div>
  );
}
