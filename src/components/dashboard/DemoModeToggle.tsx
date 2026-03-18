import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface DemoModeToggleProps {
  className?: string;
  labelClassName?: string;
}

export function DemoModeToggle({ className, labelClassName }: DemoModeToggleProps = {}) {
  const { isDemoMode, setDemoMode } = useApp();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sparkles className={`h-4 w-4 ${isDemoMode ? 'text-warning' : 'text-muted-foreground'}`} />
      <span className={cn("hidden text-xs text-muted-foreground sm:inline", labelClassName)}>Demo</span>
      <Switch
        checked={isDemoMode}
        onCheckedChange={setDemoMode}
        aria-label="Demo mode"
      />
    </div>
  );
}
