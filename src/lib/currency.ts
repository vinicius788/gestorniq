/**
 * Multi-currency support
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'BRL';

export const CURRENCIES: Record<Currency, { symbol: string; locale: string; name: string }> = {
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
  BRL: { symbol: 'R$', locale: 'pt-BR', name: 'Brazilian Real' },
};

/**
 * Format currency value with proper locale and symbol
 */
export function formatCurrency(
  value: number | null,
  currency: Currency = 'USD'
): string {
  if (value === null) return '—';
  
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format large currency value with K/M/B suffix
 */
export function formatLargeCurrency(
  value: number | null,
  currency: Currency = 'USD'
): string {
  if (value === null) return '—';
  
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  
  if (value >= 1_000_000_000) {
    return `${config.symbol}${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${config.symbol}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${config.symbol}${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value, currency);
}

/**
 * Format percentage with sign
 */
export function formatPercentage(value: number | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Format percentage without sign
 */
export function formatPercentageSimple(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | null, locale: string = 'en-US'): string {
  if (value === null) return '—';
  return value.toLocaleString(locale);
}

/**
 * Format date
 */
export function formatDate(date: string | Date, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale);
}
