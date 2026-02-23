import { useApp } from '@/contexts/AppContext';
import type { Timeframe } from '@/lib/calculations';
import { timeframeLabels } from '@/lib/formatters';
import { SegmentedControl } from '@/components/ui/segmented-control';

const timeframes: Timeframe[] = ['30d', '90d', '12m', 'all'];

const shortLabels: Record<Timeframe, string> = {
  '30d': '30d',
  '90d': '90d',
  '12m': '12m',
  'all': 'All',
};

export function TimeframeSelector() {
  const { timeframe, setTimeframe } = useApp();

  return (
    <SegmentedControl
      value={timeframe}
      onChange={setTimeframe}
      options={timeframes.map((tf) => ({
        value: tf,
        label: shortLabels[tf],
        title: timeframeLabels[tf],
      }))}
    />
  );
}
