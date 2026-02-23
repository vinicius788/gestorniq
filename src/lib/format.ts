/**
 * Unified formatting utilities for investor-grade number display
 * Single source of truth for all monetary, numeric, and percentage formatting
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'BRL';
export type Locale = 'en-US' | 'pt-BR' | 'de-DE' | 'en-GB';

export interface FormatOptions {
  decimals?: number;
  compact?: boolean;
  showSign?: boolean;
}

export const CURRENCY_CONFIG: Record<Currency, { symbol: string; locale: Locale }> = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  BRL: { symbol: 'R$', locale: 'pt-BR' },
};

/**
 * Format monetary value using Intl.NumberFormat
 * Returns object with symbol, value, and suffix for flexible rendering
 */
export function formatMoney(
  value: number | null | undefined,
  currency: Currency = 'USD',
  options: FormatOptions = {}
): { symbol: string; value: string; suffix: string; full: string } {
  const { decimals = 0, compact = false } = options;
  const config = CURRENCY_CONFIG[currency];
  
  if (value === null || value === undefined) {
    return { symbol: config.symbol, value: '—', suffix: '', full: '—' };
  }

  // Handle compact notation manually for better control
  if (compact && Math.abs(value) >= 1000) {
    let suffix = '';
    let scaledValue = value;
    
    if (Math.abs(value) >= 1_000_000_000) {
      scaledValue = value / 1_000_000_000;
      suffix = 'B';
    } else if (Math.abs(value) >= 1_000_000) {
      scaledValue = value / 1_000_000;
      suffix = 'M';
    } else if (Math.abs(value) >= 1_000) {
      scaledValue = value / 1_000;
      suffix = 'K';
    }
    
    const formattedValue = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: suffix ? 2 : decimals,
      maximumFractionDigits: suffix ? 2 : decimals,
    }).format(scaledValue);
    
    return {
      symbol: config.symbol,
      value: formattedValue,
      suffix,
      full: `${config.symbol}${formattedValue}${suffix}`,
    };
  }

  // Standard formatting
  const formattedValue = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return {
    symbol: config.symbol,
    value: formattedValue,
    suffix: '',
    full: `${config.symbol}${formattedValue}`,
  };
}

/**
 * Format number using Intl.NumberFormat
 */
export function formatNumber(
  value: number | null | undefined,
  locale: Locale = 'en-US',
  options: FormatOptions = {}
): string {
  const { decimals = 0, compact = false, showSign = false } = options;
  
  if (value === null || value === undefined) {
    return '—';
  }

  if (compact && Math.abs(value) >= 1000) {
    let suffix = '';
    let scaledValue = value;
    
    if (Math.abs(value) >= 1_000_000_000) {
      scaledValue = value / 1_000_000_000;
      suffix = 'B';
    } else if (Math.abs(value) >= 1_000_000) {
      scaledValue = value / 1_000_000;
      suffix = 'M';
    } else if (Math.abs(value) >= 1_000) {
      scaledValue = value / 1_000;
      suffix = 'K';
    }
    
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(scaledValue);
    
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${formatted}${suffix}`;
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${formatted}`;
}

/**
 * Format percentage value
 */
export function formatPercent(
  value: number | null | undefined,
  options: FormatOptions = {}
): string {
  const { decimals = 1, showSign = false } = options;
  
  if (value === null || value === undefined) {
    return '—';
  }

  const formatted = value.toFixed(decimals);
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * Format date in consistent locale
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale: Locale = 'en-US'
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale);
}

/**
 * Helper to get simple currency string for display
 */
export function formatCurrencySimple(
  value: number | null | undefined,
  currency: Currency = 'USD',
  compact = false
): string {
  return formatMoney(value, currency, { compact }).full;
}

/**
 * Growth/churn labels
 */
export function getGrowthLabel(value: number | null): {
  label: string;
  symbol: string;
  variant: 'success' | 'warning' | 'neutral' | 'destructive';
} {
  if (value === null || value === undefined) {
    return { label: 'No data', symbol: '—', variant: 'neutral' };
  }
  
  if (value > 20) return { label: 'Excellent', symbol: '+++', variant: 'success' };
  if (value > 10) return { label: 'Strong', symbol: '++', variant: 'success' };
  if (value > 5) return { label: 'Healthy', symbol: '+', variant: 'success' };
  if (value > 0) return { label: 'Growing', symbol: '~', variant: 'warning' };
  if (value === 0) return { label: 'Stable', symbol: '=', variant: 'neutral' };
  return { label: 'Declining', symbol: '!', variant: 'destructive' };
}

export function getChurnLabel(value: number | null): {
  label: string;
  variant: 'success' | 'warning' | 'destructive' | 'neutral';
} {
  if (value === null || value === undefined) {
    return { label: 'No data', variant: 'neutral' };
  }
  
  if (value < 2) return { label: 'Excellent', variant: 'success' };
  if (value < 5) return { label: 'Healthy', variant: 'success' };
  if (value < 10) return { label: 'Attention', variant: 'warning' };
  return { label: 'Critical', variant: 'destructive' };
}
