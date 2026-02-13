import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type DataSourceType = 'demo' | 'manual' | 'csv' | 'stripe';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  data_source: DataSourceType | null;
}

interface CompanyContextType {
  company: Company | null;
  loading: boolean;
  error: string | null;
  updateCompany: (updates: Partial<Company>) => Promise<void>;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = async () => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setCompany(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch company');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [user]);

  const updateCompany = async (updates: Partial<Company>) => {
    if (!company) return;

    const { error: updateError } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id);

    if (updateError) throw updateError;
    await fetchCompany();
  };

  return (
    <CompanyContext.Provider value={{ company, loading, error, updateCompany, refetch: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
