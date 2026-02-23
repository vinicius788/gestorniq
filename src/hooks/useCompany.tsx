import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
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
  ensureCompany: () => Promise<Company | null>;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureCompany = useCallback(async () => {
    if (!user) return null;

    const { data, error: ensureError } = await supabase.rpc('ensure_company_for_current_user');
    if (ensureError) throw ensureError;

    return (data as Company | null) ?? null;
  }, [user]);

  const fetchCompany = useCallback(async () => {
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
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        setCompany(data);
        setError(null);
        return;
      }

      const ensuredCompany = await ensureCompany();
      setCompany(ensuredCompany);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch company');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [ensureCompany, user]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const updateCompany = async (updates: Partial<Company>) => {
    if (!company) throw new Error('Company not found');

    const { error: updateError } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id);

    if (updateError) throw updateError;
    await fetchCompany();
  };

  return (
    <CompanyContext.Provider value={{ company, loading, error, updateCompany, ensureCompany, refetch: fetchCompany }}>
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
