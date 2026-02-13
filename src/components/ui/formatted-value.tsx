import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatPercent, type Currency, type Locale, type FormatOptions } from "@/lib/format";

interface FormattedMoneyProps {
  value: number | null | undefined;
  currency?: Currency;
  compact?: boolean;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
  symbolClassName?: string;
}

interface FormattedNumberProps {
  value: number | null | undefined;
  locale?: Locale;
  compact?: boolean;
  decimals?: number;
  showSign?: boolean;
  className?: string;
}

interface FormattedPercentProps {
  value: number | null | undefined;
  decimals?: number;
  showSign?: boolean;
  colorize?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

const symbolSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
  xl: 'text-base',
  '2xl': 'text-lg',
  '3xl': 'text-xl',
  '4xl': 'text-2xl',
  '5xl': 'text-3xl',
};

/**
 * FormattedMoney - Renders monetary values with proper formatting
 * - Currency symbol is smaller and baseline-aligned
 * - Uses tabular numerals for alignment
 * - Never wraps to multiple lines
 */
export function FormattedMoney({
  value,
  currency = 'USD',
  compact = false,
  decimals = 0,
  size = 'lg',
  className,
  symbolClassName,
}: FormattedMoneyProps) {
  const formatted = formatMoney(value, currency, { compact, decimals });
  const isPlaceholder = formatted.value === '—';

  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap tabular-nums font-bold",
        sizeClasses[size],
        className
      )}
    >
      {!isPlaceholder && (
        <span
          className={cn(
            "font-medium text-muted-foreground mr-0.5",
            symbolSizeClasses[size],
            symbolClassName
          )}
        >
          {formatted.symbol}
        </span>
      )}
      <span>{formatted.value}</span>
      {formatted.suffix && (
        <span className={cn("font-semibold", symbolSizeClasses[size])}>
          {formatted.suffix}
        </span>
      )}
    </span>
  );
}

/**
 * FormattedNumber - Renders numeric values with proper formatting
 */
export function FormattedNumber({
  value,
  locale = 'en-US',
  compact = false,
  decimals = 0,
  showSign = false,
  className,
}: FormattedNumberProps) {
  const formatted = formatNumber(value, locale, { compact, decimals, showSign });

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        className
      )}
    >
      {formatted}
    </span>
  );
}

/**
 * FormattedPercent - Renders percentage values with proper formatting
 */
export function FormattedPercent({
  value,
  decimals = 1,
  showSign = false,
  colorize = false,
  className,
}: FormattedPercentProps) {
  const formatted = formatPercent(value, { decimals, showSign });
  const isPlaceholder = formatted === '—';
  const isPositive = value !== null && value !== undefined && value > 0;
  const isNegative = value !== null && value !== undefined && value < 0;

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        colorize && isPositive && "text-success",
        colorize && isNegative && "text-destructive",
        className
      )}
    >
      {formatted}
    </span>
  );
}

/**
 * MetricValue - Combined component for metric cards
 * Handles money, numbers, and percentages with consistent styling
 */
interface MetricValueProps {
  value: number | null | undefined;
  type: 'money' | 'number' | 'percent';
  currency?: Currency;
  locale?: Locale;
  compact?: boolean;
  decimals?: number;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
}

export function MetricValue({
  value,
  type,
  currency = 'USD',
  locale = 'en-US',
  compact = false,
  decimals,
  showSign = false,
  size = '2xl',
  className,
}: MetricValueProps) {
  if (type === 'money') {
    return (
      <FormattedMoney
        value={value}
        currency={currency}
        compact={compact}
        decimals={decimals ?? 0}
        size={size}
        className={className}
      />
    );
  }

  if (type === 'percent') {
    return (
      <FormattedPercent
        value={value}
        decimals={decimals ?? 1}
        showSign={showSign}
        className={cn(sizeClasses[size], "font-bold", className)}
      />
    );
  }

  return (
    <FormattedNumber
      value={value}
      locale={locale}
      compact={compact}
      decimals={decimals ?? 0}
      showSign={showSign}
      className={cn(sizeClasses[size], "font-bold", className)}
    />
  );
}
