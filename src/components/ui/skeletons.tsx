import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/5 p-6">
      <div className="h-3 w-16 rounded bg-white/10 mb-3" />
      <div className="h-8 w-24 rounded bg-white/10 mb-2" />
      <div className="h-3 w-12 rounded bg-white/10" />
    </div>
  );
}

function ChartBarsSkeleton() {
  const bars = [40, 55, 45, 70, 60, 80, 65, 90, 75, 85, 70, 95];

  return (
    <div className="flex h-32 items-end gap-1">
      {bars.map((height, index) => (
        <div
          key={`${height}-${index}`}
          className="flex-1 rounded-sm bg-white/10"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/5 p-6">
      <div className="h-3 w-24 rounded bg-white/10 mb-6" />
      <ChartBarsSkeleton />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/5 bg-white/5 p-6">
      <div className="h-3 w-24 rounded bg-white/10 mb-6" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full bg-white/10" />
        <Skeleton className="h-10 w-full bg-white/10" />
        <Skeleton className="h-10 w-full bg-white/10" />
        <Skeleton className="h-10 w-full bg-white/10" />
      </div>
    </div>
  );
}
