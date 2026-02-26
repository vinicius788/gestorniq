import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useApp } from '@/contexts/AppContext';
import { 
  calculateMetrics, 
  filterByTimeframe,
  type RevenueSnapshot, 
  type UserMetric, 
  type ValuationSnapshot,
  type CalculatedMetrics 
} from '@/lib/calculations';
import { generateDemoData } from '@/lib/demo-data';
import {
  normalizeRevenueSnapshotInput,
  normalizeUserMetricInput,
  type RevenueSnapshotInput,
  type UserMetricInput,
} from '@/lib/metric-input';
import type { Timeframe } from '@/lib/calculations';

export type { RevenueSnapshot, UserMetric, ValuationSnapshot, CalculatedMetrics };

const SNAPSHOT_PAGE_SIZE = 200;
const SNAPSHOT_MAX_ROWS = 1200;

function getSnapshotCutoffDate(timeframe: Timeframe): string | null {
  if (timeframe === 'all') {
    return null;
  }

  const daysByTimeframe: Record<Exclude<Timeframe, 'all'>, number> = {
    '30d': 45,
    '90d': 120,
    '12m': 400,
  };

  const now = new Date();
  now.setDate(now.getDate() - daysByTimeframe[timeframe]);
  return now.toISOString().split('T')[0];
}

async function fetchPagedSnapshots<T>({
  table,
  companyId,
  cutoffDate,
}: {
  table: 'revenue_snapshots' | 'user_metrics' | 'valuation_snapshots';
  companyId: string;
  cutoffDate: string | null;
}): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;

  while (offset < SNAPSHOT_MAX_ROWS) {
    let query = supabase
      .from(table)
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false })
      .range(offset, offset + SNAPSHOT_PAGE_SIZE - 1);

    if (cutoffDate) {
      query = query.gte('date', cutoffDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const page = (data || []) as T[];
    allRows.push(...page);

    if (page.length < SNAPSHOT_PAGE_SIZE) {
      break;
    }

    offset += SNAPSHOT_PAGE_SIZE;
  }

  return allRows.slice(0, SNAPSHOT_MAX_ROWS);
}

export function useMetrics() {
  const { company } = useCompany();
  const { timeframe, isDemoMode } = useApp();
  
  const [revenueSnapshots, setRevenueSnapshots] = useState<RevenueSnapshot[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [valuationSnapshots, setValuationSnapshots] = useState<ValuationSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    // Use generated data while demo mode is enabled.
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

      const cutoffDate = getSnapshotCutoffDate(timeframe);

      const [revenueData, userData, valuationData] = await Promise.all([
        fetchPagedSnapshots<RevenueSnapshot>({
          table: 'revenue_snapshots',
          companyId: company.id,
          cutoffDate,
        }),
        fetchPagedSnapshots<UserMetric>({
          table: 'user_metrics',
          companyId: company.id,
          cutoffDate,
        }),
        fetchPagedSnapshots<ValuationSnapshot>({
          table: 'valuation_snapshots',
          companyId: company.id,
          cutoffDate,
        }),
      ]);

      setRevenueSnapshots(revenueData);
      setUserMetrics(userData);
      setValuationSnapshots(valuationData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [company, isDemoMode, timeframe]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Compute dashboard metrics through the centralized calculation module.
  const metrics: CalculatedMetrics = calculateMetrics(
    revenueSnapshots,
    userMetrics,
    valuationSnapshots,
    timeframe
  );

  const filteredRevenueSnapshots = filterByTimeframe(revenueSnapshots, timeframe);
  const filteredUserMetrics = filterByTimeframe(userMetrics, timeframe);
  const filteredValuationSnapshots = filterByTimeframe(valuationSnapshots, timeframe);

  const toMetricsWriteError = (error: unknown) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('row-level security') || message.includes('permission denied')) {
        return new Error('Access blocked. An active trial or subscription is required to import data.');
      }
      return error;
    }
    return new Error('Failed to save metrics data.');
  };

  // Add revenue snapshot.
  const addRevenueSnapshot = async (data: RevenueSnapshotInput) => {
    if (isDemoMode) {
      throw new Error('Cannot add data in demo mode');
    }
    if (!company) throw new Error('No company selected');

    const payload = normalizeRevenueSnapshotInput(data);

    const { error } = await supabase
      .from('revenue_snapshots')
      .upsert({
        company_id: company.id,
        ...payload,
      }, { onConflict: 'company_id,date' });

    if (error) throw toMetricsWriteError(error);
    await fetchMetrics();
  };

  const addRevenueSnapshots = async (entries: RevenueSnapshotInput[]) => {
    if (isDemoMode) {
      throw new Error('Cannot add data in demo mode');
    }
    if (!company) throw new Error('No company selected');
    if (entries.length === 0) return;

    const payload = entries.map((entry) => ({
      company_id: company.id,
      ...normalizeRevenueSnapshotInput(entry),
    }));

    const { error } = await supabase
      .from('revenue_snapshots')
      .upsert(payload, { onConflict: 'company_id,date' });

    if (error) throw toMetricsWriteError(error);
    await fetchMetrics();
  };

  // Add user metrics snapshot.
  const addUserMetrics = async (data: UserMetricInput) => {
    if (isDemoMode) {
      throw new Error('Cannot add data in demo mode');
    }
    if (!company) throw new Error('No company selected');

    const payload = normalizeUserMetricInput(data);

    const { error } = await supabase
      .from('user_metrics')
      .upsert({
        company_id: company.id,
        ...payload,
      }, { onConflict: 'company_id,date' });

    if (error) throw toMetricsWriteError(error);
    await fetchMetrics();
  };

  const addUserMetricsBatch = async (entries: UserMetricInput[]) => {
    if (isDemoMode) {
      throw new Error('Cannot add data in demo mode');
    }
    if (!company) throw new Error('No company selected');
    if (entries.length === 0) return;

    const payload = entries.map((entry) => ({
      company_id: company.id,
      ...normalizeUserMetricInput(entry),
    }));

    const { error } = await supabase
      .from('user_metrics')
      .upsert(payload, { onConflict: 'company_id,date' });

    if (error) throw toMetricsWriteError(error);
    await fetchMetrics();
  };

  // Calculate and save valuation snapshot.
  const calculateValuation = async (multiple?: number) => {
    if (isDemoMode) {
      throw new Error('Cannot save in demo mode');
    }
    if (!company) throw new Error('No company selected');

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
    filteredRevenueSnapshots,
    filteredUserMetrics,
    filteredValuationSnapshots,
    // Keep compatibility with legacy consumers.
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
    addRevenueSnapshots,
    addUserMetrics,
    addUserMetricsBatch,
    calculateValuation,
    refetch: fetchMetrics,
  };
}
