import { LucideIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  icon?: LucideIcon;
  tooltip?: string;
  empty?: boolean;
  emptyText?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  tooltip,
  empty = false,
  emptyText = "No data yet",
  className,
}: StatCardProps) {
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
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {tooltip && (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="text-2xl font-bold text-foreground sm:text-3xl whitespace-nowrap tabular-nums">
            {empty ? "—" : value}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {empty ? (
              <span className="text-xs text-muted-foreground">{emptyText}</span>
            ) : (
              <>
                <DeltaBadge value={delta} />
                {deltaLabel && <span className="text-xs text-muted-foreground">{deltaLabel}</span>}
              </>
            )}
          </div>
        </div>

        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
