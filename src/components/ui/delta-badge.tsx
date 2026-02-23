import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface DeltaBadgeProps {
  value: number | null | undefined;
  className?: string;
  showSign?: boolean;
}

export function DeltaBadge({ value, className, showSign = true }: DeltaBadgeProps) {
  if (value === null || value === undefined) {
    return null;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;

  if (value === 0) {
    return (
      <span className={cn("inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground", className)}>
        0%
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        isPositive && "border-success/40 bg-success/10 text-success",
        isNegative && "border-destructive/40 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {showSign && isPositive ? "+" : ""}
      {formatPercent(value, { decimals: 1 })}
    </span>
  );
}
