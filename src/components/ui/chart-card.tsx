import { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCardSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  actions,
  loading = false,
  isEmpty = false,
  emptyIcon,
  emptyTitle = "No data available",
  emptyDescription = "Connect a data source or add metrics to render this chart.",
  emptyActionLabel,
  onEmptyAction,
  className,
  children,
}: ChartCardProps) {
  if (loading) {
    return <ChartCardSkeleton />;
  }

  return (
    <section className={cn("metric-card", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
          </div>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {isEmpty && emptyIcon ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          className="min-h-[280px]"
        />
      ) : (
        children
      )}
    </section>
  );
}
