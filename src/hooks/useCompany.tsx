import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  UI_PREVIEW_COMPANY_STORAGE_KEY,
  UI_PREVIEW_DEFAULTS,
} from '@/lib/auth-config';

export type DataSourceType = 'demo' | 'manual' | 'csv' | 'stripe';

export interface Company {
  id: string;
  user_id: string | null;
  clerk_user_id: string;
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

const DB_MIGRATION_REQUIRED_MESSAGE =
  'Database migration required: apply Clerk ID migration (UUID -> clerk_user_id) and retry.';

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

const normalizeWorkspaceError = (message: string) => {
  const normalized = message.toLowerCase();
  const isUuidMismatch =
    normalized.includes('invalid input syntax for type uuid') &&
    normalized.includes('user_');

  if (isUuidMismatch) {
    return DB_MIGRATION_REQUIRED_MESSAGE;
  }

  return message;
};

const buildPreviewCompany = (overrides: Partial<Company> = {}): Company => {
  const nowIso = new Date().toISOString();

  return {
    id: UI_PREVIEW_DEFAULTS.companyId,
    user_id: UI_PREVIEW_DEFAULTS.userId,
    clerk_user_id: UI_PREVIEW_DEFAULTS.userId,
    name: UI_PREVIEW_DEFAULTS.companyName,
    currency: 'USD',
    created_at: nowIso,
    updated_at: nowIso,
    onboarding_completed: true,
    onboarding_completed_at: nowIso,
    data_source: 'demo',
    ...overrides,
  };
};

const readPreviewCompany = (): Company => {
  if (typeof window === 'undefined') {
    return buildPreviewCompany();
  }

  const rawCompany = localStorage.getItem(UI_PREVIEW_COMPANY_STORAGE_KEY);
  if (!rawCompany) {
    return buildPreviewCompany();
  }

  try {
    const parsedCompany = JSON.parse(rawCompany) as Partial<Company>;
    return buildPreviewCompany(parsedCompany);
  } catch {
    return buildPreviewCompany();
  }
};

const persistPreviewCompany = (company: Company) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UI_PREVIEW_COMPANY_STORAGE_KEY, JSON.stringify(company));
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, isPreviewAccess } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentCompany = useCallback(async (): Promise<Company | null> => {
    const { data, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      throw new Error(
        normalizeWorkspaceError(getErrorMessage(fetchError, 'Failed to fetch workspace.')),
      );
    }

    return (data as Company | null) ?? null;
  }, []);

  const syncCompany = useCallback(async (): Promise<Company | null> => {
    if (isPreviewAccess) {
      const previewCompany = readPreviewCompany();
      persistPreviewCompany(previewCompany);
      setCompany(previewCompany);
      setError(null);
      setLoading(false);
      return previewCompany;
    }

    if (!user) {
      setCompany(null);
      setError(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      const resolvedCompany = await fetchCurrentCompany();
      setCompany(resolvedCompany);
      setError(null);
      return resolvedCompany;
    } catch (err) {
      setError(normalizeWorkspaceError(getErrorMessage(err, 'Failed to fetch company')));
      setCompany(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentCompany, isPreviewAccess, user]);

  const ensureCompany = useCallback(async (): Promise<Company | null> => {
    if (isPreviewAccess) {
      return syncCompany();
    }

    if (!user) {
      setCompany(null);
      setError(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: ensureError } = await supabase.rpc('ensure_company_for_current_user');

      if (ensureError) {
        throw new Error(
          normalizeWorkspaceError(getErrorMessage(ensureError, 'Workspace recovery failed.')),
        );
      }

      const resolvedCompany = await fetchCurrentCompany();

      if (!resolvedCompany) {
        throw new Error('Workspace was created but could not be loaded. Please retry.');
      }

      setCompany(resolvedCompany);
      return resolvedCompany;
    } catch (err) {
      setError(normalizeWorkspaceError(getErrorMessage(err, 'Failed to create workspace')));
      setCompany(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentCompany, isPreviewAccess, syncCompany, user]);

  const fetchCompany = useCallback(async () => {
    await syncCompany();
  }, [syncCompany]);

  useEffect(() => {
    void fetchCompany();
  }, [fetchCompany]);

  const updateCompany = async (updates: Partial<Company>) => {
    if (!company) throw new Error('Company not found');

    if (isPreviewAccess) {
      const nextCompany = buildPreviewCompany({
        ...company,
        ...updates,
        updated_at: new Date().toISOString(),
      });
      persistPreviewCompany(nextCompany);
      setCompany(nextCompany);
      setError(null);
      return;
    }

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
