import { cn } from "@/lib/utils";
import { CURRENCY_CONFIG, type Currency } from "@/lib/format";

interface MoneyValueProps {
  value: number | null | undefined;
  currency?: Currency;
  /**
   * "badge" = Show currency code as small badge (e.g., "USD 45,200")
   * "symbol" = Show currency symbol smaller than number (e.g., "$ 45,200")
   */
  mode?: "badge" | "symbol";
  /**
   * Abbreviate large numbers (K, M, B)
   */
  abbreviate?: boolean;
  /**
   * Number of decimal places (default: 0)
   */
  decimals?: number;
  /**
   * Size of the main number
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
};

const badgeSizeClasses: Record<string, string> = {
  xs: "text-[8px] px-1 py-0.5",
  sm: "text-[9px] px-1 py-0.5",
  md: "text-[10px] px-1.5 py-0.5",
  lg: "text-[10px] px-1.5 py-0.5",
  xl: "text-xs px-1.5 py-0.5",
  "2xl": "text-xs px-1.5 py-0.5",
  "3xl": "text-xs px-2 py-0.5",
  "4xl": "text-sm px-2 py-1",
  "5xl": "text-sm px-2 py-1",
  "6xl": "text-base px-2 py-1",
};

const symbolSizeClasses: Record<string, string> = {
  xs: "text-[9px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-sm",
  "2xl": "text-base",
  "3xl": "text-lg",
  "4xl": "text-xl",
  "5xl": "text-2xl",
  "6xl": "text-3xl",
};

/**
 * Formats a number with abbreviation (K, M, B) or standard formatting
 */
function formatValue(
  value: number,
  locale: string,
  abbreviate: boolean,
  decimals: number
): { formatted: string; suffix: string } {
  if (abbreviate && Math.abs(value) >= 1000) {
    let suffix = "";
    let scaledValue = value;

    if (Math.abs(value) >= 1_000_000_000) {
      scaledValue = value / 1_000_000_000;
      suffix = "B";
    } else if (Math.abs(value) >= 1_000_000) {
      scaledValue = value / 1_000_000;
      suffix = "M";
    } else if (Math.abs(value) >= 1_000) {
      scaledValue = value / 1_000;
      suffix = "K";
    }

    // For abbreviated values, use 2 decimal places max
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(scaledValue);

    return { formatted, suffix };
  }

  // Standard formatting
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return { formatted, suffix: "" };
}

/**
 * MoneyValue - Investor-grade money display component
 * 
 * Features:
 * - Never wraps to multiple lines (whitespace-nowrap)
 * - Tabular numerals for alignment (tabular-nums)
 * - Tight letter spacing (tracking-tight)
 * - Currency displayed smaller than number
 * - Badge or symbol mode
 */
export function MoneyValue({
  value,
  currency = "USD",
  mode = "symbol",
  abbreviate = false,
  decimals = 0,
  size = "2xl",
  className,
}: MoneyValueProps) {
  const config = CURRENCY_CONFIG[currency];
  const locale = config?.locale || "en-US";
  const symbol = config?.symbol || "$";
  const currencyCode = currency;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline whitespace-nowrap tabular-nums tracking-tight font-bold leading-none",
          sizeClasses[size],
          className
        )}
      >
        —
      </span>
    );
  }

  const { formatted, suffix } = formatValue(value, locale, abbreviate, decimals);

  if (mode === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums tracking-tight font-bold leading-none",
          sizeClasses[size],
          className
        )}
      >
        <span
          className={cn(
            "rounded bg-muted text-muted-foreground font-semibold uppercase",
            badgeSizeClasses[size]
          )}
        >
          {currencyCode}
        </span>
        <span>{formatted}</span>
        {suffix && (
          <span className={cn("font-semibold", symbolSizeClasses[size])}>
            {suffix}
          </span>
        )}
      </span>
    );
  }

  // Symbol mode (default)
  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap tabular-nums tracking-tight font-bold leading-none",
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          "font-medium text-muted-foreground mr-0.5",
          symbolSizeClasses[size]
        )}
      >
        {symbol}
      </span>
      <span>{formatted}</span>
      {suffix && (
        <span className={cn("font-semibold", symbolSizeClasses[size])}>
          {suffix}
        </span>
      )}
    </span>
  );
}

/**
 * Compact MoneyValue - Always abbreviated, smaller symbol
 */
export function MoneyValueCompact(
  props: Omit<MoneyValueProps, "abbreviate">
) {
  return <MoneyValue {...props} abbreviate />;
}
