import type { LucideIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 rounded-full border border-white/10 bg-white/5 p-4">
        <Icon className="h-6 w-6 text-white/30" />
      </div>
      <h3 className="text-sm font-medium text-white/60">{title}</h3>
      <p className="mt-1 max-w-lg text-xs text-white/30">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
