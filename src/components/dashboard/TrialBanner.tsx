import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTrial } from '@/hooks/useTrial';

interface TrialBannerProps {
  className?: string;
}

export function TrialBanner({ className }: TrialBannerProps) {
  const { isTrialActive, daysRemaining, loading } = useTrial();

  if (loading || !isTrialActive) return null;

  const isUrgent = daysRemaining <= 1;
  const label = isUrgent
    ? 'Trial ends today'
    : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in trial`;

  return (
    <Link
      to="/dashboard/billing"
      className={cn(
        "group inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400 transition-colors hover:border-amber-400/30 hover:bg-amber-500/15",
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
      <span className="hidden xl:inline">{label}</span>
      <span className="ml-1 font-semibold text-amber-300 transition-colors group-hover:text-amber-200">
        Upgrade →
      </span>
    </Link>
  );
}
