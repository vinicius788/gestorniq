import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  change?: number | null;
  changeLabel?: string;
  icon: LucideIcon;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs previous",
  icon: Icon,
  className 
}: MetricCardProps) {
  const isPositive = change !== null && change !== undefined && change > 0;
  const isNegative = change !== null && change !== undefined && change < 0;
  const hasChange = change !== null && change !== undefined;

  return (
    <div
      className={cn(
        "group relative cursor-default overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-black/20",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.06), transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-2">{title}</p>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground whitespace-nowrap tabular-nums">
            {value}
          </div>
          {hasChange ? (
            <div className="flex items-center gap-1 flex-wrap">
              {isPositive && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    color: "#22c55e",
                    borderColor: "rgba(34,197,94,0.2)",
                  }}
                >
                  <TrendingUp className="mr-1 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-70" />
                  +{formatPercent(change, { decimals: 1 })}
                </span>
              )}
              {isNegative && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    borderColor: "rgba(239,68,68,0.2)",
                  }}
                >
                  <TrendingDown className="mr-1 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-70" />
                  {formatPercent(change, { decimals: 1 })}
                </span>
              )}
              {change === 0 && (
                <span className="text-xs sm:text-sm font-medium text-muted-foreground tabular-nums">0%</span>
              )}
              {changeLabel && (
                <span className="text-xs sm:text-sm text-muted-foreground truncate">{changeLabel}</span>
              )}
            </div>
          ) : (
            <div className="h-5" />
          )}
        </div>
        <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary/70" />
        </div>
      </div>
    </div>
  );
}
