import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useApp } from '@/contexts/AppContext';
import { 
  calculateMetrics, 
  type RevenueSnapshot, 
  type UserMetric, 
  type ValuationSnapshot,
  type CalculatedMetrics 
} from '@/lib/calculations';
import { generateDemoData } from '@/lib/demo-data';

export type { RevenueSnapshot, UserMetric, ValuationSnapshot, CalculatedMetrics };

export function useMetrics() {
  const { company } = useCompany();
  const { timeframe, isDemoMode } = useApp();
  
  const [revenueSnapshots, setRevenueSnapshots] = useState<RevenueSnapshot[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [valuationSnapshots, setValuationSnapshots] = useState<ValuationSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    // Se está em modo demo, usar dados gerados
    if (isDemoMode) {
      const demoData = generateDemoData();
      setRevenueSnapshots(demoData.revenueSnapshots);
      setUserMetrics(demoData.userMetrics);
      setValuationSnapshots(demoData.valuationSnapshots);
      setLoading(false);
      setError(null);
      return;
    }

    if (!company) {
      setRevenueSnapshots([]);
      setUserMetrics([]);
      setValuationSnapshots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [revenueRes, userRes, valuationRes] = await Promise.all([
        supabase
          .from('revenue_snapshots')
          .select('*')
          .eq('company_id', company.id)
          .order('date', { ascending: false }),
        supabase
          .from('user_metrics')
          .select('*')
          .eq('company_id', company.id)
          .order('date', { ascending: false }),
        supabase
          .from('valuation_snapshots')
          .select('*')
          .eq('company_id', company.id)
          .order('date', { ascending: false }),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (userRes.error) throw userRes.error;
      if (valuationRes.error) throw valuationRes.error;

      setRevenueSnapshots(revenueRes.data || []);
      setUserMetrics(userRes.data || []);
      setValuationSnapshots(valuationRes.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [company, isDemoMode]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Calcular métricas usando o módulo centralizado
  const metrics: CalculatedMetrics = calculateMetrics(
    revenueSnapshots,
    userMetrics,
    valuationSnapshots,
    timeframe
  );

  // Adicionar snapshot de receita
  const addRevenueSnapshot = async (data: {
    date: string;
    mrr: number;
    new_mrr: number;
    expansion_mrr: number;
    churned_mrr: number;
    source: string;
  }) => {
    if (isDemoMode) {
      throw new Error('Não é possível adicionar dados em modo demo');
    }
    if (!company) throw new Error('Nenhuma empresa selecionada');

    const { error } = await supabase
      .from('revenue_snapshots')
      .upsert({
        company_id: company.id,
        ...data,
      }, { onConflict: 'company_id,date' });

    if (error) throw error;
    await fetchMetrics();
  };

  // Adicionar métricas de usuário
  const addUserMetrics = async (data: {
    date: string;
    total_users: number;
    new_users: number;
    active_users: number;
    churned_users: number;
    source: string;
  }) => {
    if (isDemoMode) {
      throw new Error('Não é possível adicionar dados em modo demo');
    }
    if (!company) throw new Error('Nenhuma empresa selecionada');

    const { error } = await supabase
      .from('user_metrics')
      .upsert({
        company_id: company.id,
        ...data,
      }, { onConflict: 'company_id,date' });

    if (error) throw error;
    await fetchMetrics();
  };

  // Calcular e salvar valuation
  const calculateValuation = async (multiple?: number) => {
    if (isDemoMode) {
      throw new Error('Não é possível salvar em modo demo');
    }
    if (!company) throw new Error('Nenhuma empresa selecionada');

    const valuationMultiple = multiple ?? metrics.suggestedMultiple;
    const arr = metrics.arr ?? 0;
    const valuation = arr * valuationMultiple;

    const { error } = await supabase
      .from('valuation_snapshots')
      .upsert({
        company_id: company.id,
        date: new Date().toISOString().split('T')[0],
        mrr_growth_rate: metrics.mrrGrowth,
        user_growth_rate: metrics.userGrowth,
        valuation_multiple: valuationMultiple,
        arr,
        valuation,
      }, { onConflict: 'company_id,date' });

    if (error) throw error;
    await fetchMetrics();
  };

  return {
    revenueSnapshots,
    userMetrics,
    valuationSnapshots,
    loading,
    error,
    metrics,
    // Manter compatibilidade com código antigo
    dashboardMetrics: {
      mrr: metrics.mrr ?? 0,
      arr: metrics.arr ?? 0,
      mrrGrowth: metrics.mrrGrowth ?? 0,
      userGrowth: metrics.userGrowth ?? 0,
      totalUsers: metrics.totalUsers ?? 0,
      newUsers: metrics.newUsers ?? 0,
      activeCustomers: metrics.activeUsers ?? 0,
      churnRate: metrics.churnRate ?? 0,
      arpu: metrics.arpu ?? 0,
      valuation: metrics.valuation ?? 0,
      valuationMultiple: metrics.valuationMultiple ?? 10,
    },
    addRevenueSnapshot,
    addUserMetrics,
    calculateValuation,
    refetch: fetchMetrics,
  };
}
