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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_REGEX.test(value);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (typeof maybeError.message === 'string' && maybeError.message) {
      return maybeError.message;
    }

    if (typeof maybeError.details === 'string' && maybeError.details) {
      return maybeError.details;
    }

    if (typeof maybeError.hint === 'string' && maybeError.hint) {
      return maybeError.hint;
    }
  }

  return fallback;
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recoverCompany = useCallback(async (): Promise<Company | null> => {
    const { data: ensuredByRpc, error: ensureError } = await supabase.rpc('ensure_company_for_current_user');

    if (ensureError) {
      throw new Error(getErrorMessage(ensureError, 'Workspace recovery failed.'));
    }

    return (ensuredByRpc as Company | null) ?? null;
  }, []);

  const syncCompany = useCallback(async (): Promise<Company | null> => {
    if (!user) {
      setCompany(null);
      setError(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const resolvedCompany = await recoverCompany();
      setCompany(resolvedCompany);
      setError(null);
      return resolvedCompany;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch company'));
      setCompany(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [recoverCompany, user]);

  const ensureCompany = useCallback(async () => syncCompany(), [syncCompany]);

  const fetchCompany = useCallback(async () => {
    await syncCompany();
  }, [syncCompany]);

  useEffect(() => {
    void fetchCompany();
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
