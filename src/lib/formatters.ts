/**
 * Formatting utilities - Backward compatibility layer
 * Use src/lib/format.ts for new code
 */

export {
  formatMoney as formatCurrency,
  formatCurrencySimple,
  formatMoney as formatLargeNumber,
  formatNumber,
  formatPercent as formatPercentage,
  formatPercent as formatPercentageSimple,
  formatDate,
  getGrowthLabel,
  getChurnLabel,
} from './format';

// Re-export for backward compatibility
export function formatCurrencyValue(
  value: number | null,
  currency: string = 'USD'
): string {
  if (value === null) return '—';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Timeframe labels
 */
export const timeframeLabels: Record<string, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  'all': 'All time',
};

/**
 * Data source labels
 */
export const dataSourceLabels: Record<string, string> = {
  manual: 'Manual Entry',
  csv: 'CSV Import',
  stripe: 'Stripe',
  firebase: 'Firebase',
  posthog: 'PostHog',
  ga4: 'Google Analytics',
  supabase: 'Supabase',
};
