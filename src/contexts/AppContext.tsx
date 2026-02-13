import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Timeframe } from '@/lib/calculations';

interface AppContextType {
  // Período global
  timeframe: Timeframe;
  setTimeframe: (t: Timeframe) => void;
  
  // Modo demo
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  
  // Status de onboarding
  isOnboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TIMEFRAME: 'gestorniq-timeframe',
  DEMO_MODE: 'gestorniq-demo-mode',
  ONBOARDING_COMPLETE: 'gestorniq-onboarding-complete',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [timeframe, setTimeframeState] = useState<Timeframe>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMEFRAME);
    return (saved as Timeframe) || 'all';
  });
  
  const [isDemoMode, setDemoModeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
    return saved === 'true';
  });
  
  const [isOnboardingComplete, setOnboardingCompleteState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return saved === 'true';
  });
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  const setTimeframe = (t: Timeframe) => {
    setTimeframeState(t);
    localStorage.setItem(STORAGE_KEYS.TIMEFRAME, t);
  };

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, String(enabled));
  };

  const setOnboardingComplete = (complete: boolean) => {
    setOnboardingCompleteState(complete);
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, String(complete));
  };

  // Note: showOnboarding is now controlled by DashboardLayout based on DB state

  return (
    <AppContext.Provider value={{
      timeframe,
      setTimeframe,
      isDemoMode,
      setDemoMode,
      isOnboardingComplete,
      setOnboardingComplete,
      showOnboarding,
      setShowOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
