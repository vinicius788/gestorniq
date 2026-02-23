import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';

export function DemoModeToggle() {
  const { isDemoMode, setDemoMode } = useApp();

  return (
    <div className="flex items-center gap-2">
      <Sparkles className={`h-4 w-4 ${isDemoMode ? 'text-warning' : 'text-muted-foreground'}`} />
      <span className="text-xs text-muted-foreground hidden sm:inline">Demo</span>
      <Switch
        checked={isDemoMode}
        onCheckedChange={setDemoMode}
        aria-label="Demo mode"
      />
    </div>
  );
}
