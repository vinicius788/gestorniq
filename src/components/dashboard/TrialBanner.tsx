import { Link } from 'react-router-dom';
import { Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrial } from '@/hooks/useTrial';

export function TrialBanner() {
  const { isTrialActive, daysRemaining, loading } = useTrial();

  if (loading || !isTrialActive) return null;

  const isUrgent = daysRemaining <= 1;

  return (
    <div className={`px-4 py-2 text-center text-sm ${
      isUrgent 
        ? 'bg-destructive/20 border-b border-destructive/30' 
        : 'bg-warning/20 border-b border-warning/30'
    }`}>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Clock className={`h-4 w-4 ${isUrgent ? 'text-destructive' : 'text-warning'}`} />
        <span className="text-foreground">
          {isUrgent 
            ? 'Your trial ends today!' 
            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your trial`
          }
        </span>
        <Link to="/dashboard/billing">
          <Button size="sm" variant="outline" className="h-7 text-xs ml-2">
            <Zap className="h-3 w-3 mr-1" />
            Subscribe now
          </Button>
        </Link>
      </div>
    </div>
  );
}
