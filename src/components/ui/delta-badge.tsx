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

  if (value === 0) {
    return (
      <span
        className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums", className)}
        style={{
          background: "rgba(148,163,184,0.14)",
          color: "#cbd5e1",
          borderColor: "rgba(148,163,184,0.24)",
        }}
      >
        0%
      </span>
    );
  }

  const badgeStyle = isPositive
    ? {
        background: "rgba(34,197,94,0.15)",
        color: "#22c55e",
        borderColor: "rgba(34,197,94,0.2)",
      }
    : {
        background: "rgba(239,68,68,0.15)",
        color: "#ef4444",
        borderColor: "rgba(239,68,68,0.2)",
      };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        className,
      )}
      style={badgeStyle}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {showSign && isPositive ? "+" : ""}
      {formatPercent(value, { decimals: 1 })}
    </span>
  );
}
