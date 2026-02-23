/**
 * Módulo centralizado de cálculos - Fonte única de verdade para todas as métricas
 */

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export interface RevenueSnapshot {
  id: string;
  company_id: string;
  date: string;
  mrr: number;
  arr: number;
  new_mrr: number;
  expansion_mrr: number;
  churned_mrr: number;
  source: string;
  created_at: string;
}

export interface UserMetric {
  id: string;
  company_id: string;
  date: string;
  total_users: number;
  new_users: number;
  active_users: number;
  churned_users: number;
  source: string;
  created_at: string;
}

export interface ValuationSnapshot {
  id: string;
  company_id: string;
  date: string;
  mrr_growth_rate: number | null;
  user_growth_rate: number | null;
  valuation_multiple: number;
  arr: number;
  valuation: number;
  created_at: string;
}

export interface ForecastData {
  months: number;
  mrr: number;
  arr: number;
  valuation: number;
}

export interface CalculatedMetrics {
  // Revenue
  mrr: number | null;
  arr: number | null;
  mrrGrowth: number | null;
  newMrr: number | null;
  expansionMrr: number | null;
  churnedMrr: number | null;
  netNewMrr: number | null;
  
  // Users
  totalUsers: number | null;
  newUsers: number | null;
  activeUsers: number | null;
  churnedUsers: number | null;
  userGrowth: number | null;
  churnRate: number | null;
  
  // Derived
  arpu: number | null;
  avgDailySignups: number | null;
  
  // Valuation
  valuation: number | null;
  valuationMultiple: number | null;
  suggestedMultiple: number;
  
  // Forecasts
  forecast3m: ForecastData | null;
  forecast6m: ForecastData | null;
  forecast12m: ForecastData | null;
  
  // Status
  hasRevenueData: boolean;
  hasUserData: boolean;
  hasData: boolean;
}

export type Timeframe = '30d' | '90d' | '12m' | 'all';

export interface CadenceMetric {
  value: number | null;
  change: number | null;
}

export interface UserCadenceMetrics {
  daily: CadenceMetric;
  weekly: CadenceMetric;
  monthly: CadenceMetric;
}

export interface SuggestedMultipleBreakdown {
  baseMultiple: number;
  revenueGrowthRate: number;
  userGrowthRate: number;
  revenueContribution: number;
  userContribution: number;
  pmfBonus: number;
  balanceBonus: number;
  totalMultiple: number;
}

function toUtcDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function diffDays(newerDate: string, olderDate: string): number {
  const diff = toUtcDay(newerDate).getTime() - toUtcDay(olderDate).getTime();
  return Math.max(1, Math.round(diff / MS_IN_DAY));
}

function getCutoffDate(timeframe: Exclude<Timeframe, 'all'>): Date {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (timeframe === '12m') {
    const cutoff = new Date(todayUtc);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
    return cutoff;
  }

  const days = timeframe === '30d' ? 30 : 90;
  return new Date(todayUtc.getTime() - days * MS_IN_DAY);
}

/**
 * Filtra snapshots por período
 */
export function filterByTimeframe<T extends { date: string }>(
  data: T[],
  timeframe: Timeframe
): T[] {
  if (timeframe === 'all') return data;

  const cutoffDate = getCutoffDate(timeframe);
  return data.filter((item) => toUtcDay(item.date).getTime() >= cutoffDate.getTime());
}

/**
 * Calcula o múltiplo de valuation sugerido baseado em crescimento
 */
export function calculateSuggestedMultipleBreakdown(
  mrrGrowth: number | null,
  userGrowth: number | null,
): SuggestedMultipleBreakdown {
  const revenueGrowthRate = mrrGrowth ?? 0;
  const userGrowthRate = userGrowth ?? 0;

  // Base: 5x
  const baseMultiple = 5;

  // Contribuição de receita (0-30% = 0-5x)
  const revenueContribution = Math.min(revenueGrowthRate / 6, 5);

  // Contribuição de usuários (0-30% = 0-5x)
  const userContribution = Math.min(userGrowthRate / 6, 5);

  // Bônus PMF: alto crescimento de usuários com receita moderada
  const pmfBonus = userGrowthRate > 10 && revenueGrowthRate < 10 ? 2 : 0;

  // Bônus equilíbrio
  const balanceBonus = revenueGrowthRate > 5 && userGrowthRate > 5 ? 1 : 0;

  const rawTotal = baseMultiple + revenueContribution + userContribution + pmfBonus + balanceBonus;
  const totalMultiple = Math.round(rawTotal * 10) / 10;

  return {
    baseMultiple,
    revenueGrowthRate,
    userGrowthRate,
    revenueContribution,
    userContribution,
    pmfBonus,
    balanceBonus,
    totalMultiple,
  };
}

export function calculateSuggestedMultiple(
  mrrGrowth: number | null,
  userGrowth: number | null
): number {
  return calculateSuggestedMultipleBreakdown(mrrGrowth, userGrowth).totalMultiple;
}

/**
 * Calculate revenue forecast
 */
export function calculateForecast(
  currentMrr: number,
  monthlyGrowthRate: number,
  months: number,
  multiple: number
): ForecastData {
  // Compound growth: Future_MRR = Current_MRR * (1 + rate)^months
  const projectedMrr = currentMrr * Math.pow(1 + monthlyGrowthRate, months);
  const projectedArr = projectedMrr * 12;
  const projectedValuation = projectedArr * multiple;
  
  return {
    months,
    mrr: Math.round(projectedMrr),
    arr: Math.round(projectedArr),
    valuation: Math.round(projectedValuation),
  };
}

export function calculateUserCadenceMetrics(userMetrics: UserMetric[]): UserCadenceMetrics {
  const sorted = [...userMetrics].sort(
    (a, b) => toUtcDay(b.date).getTime() - toUtcDay(a.date).getTime(),
  );

  const latest = sorted[0];
  const previous = sorted[1];
  const third = sorted[2];

  if (!latest || !previous) {
    return {
      daily: { value: null, change: null },
      weekly: { value: null, change: null },
      monthly: { value: null, change: null },
    };
  }

  const currentPeriodDays = diffDays(latest.date, previous.date);
  const previousPeriodDays = third ? diffDays(previous.date, third.date) : currentPeriodDays;

  const currentDaily = latest.new_users / currentPeriodDays;
  const previousDaily = previous.new_users / previousPeriodDays;

  const change = previousDaily > 0
    ? ((currentDaily - previousDaily) / previousDaily) * 100
    : null;

  return {
    daily: {
      value: currentDaily,
      change,
    },
    weekly: {
      value: currentDaily * 7,
      change,
    },
    monthly: {
      value: currentDaily * 30,
      change,
    },
  };
}

/**
 * Calculate all metrics from snapshots
 */
export function calculateMetrics(
  revenueSnapshots: RevenueSnapshot[],
  userMetrics: UserMetric[],
  valuationSnapshots: ValuationSnapshot[],
  timeframe: Timeframe = 'all'
): CalculatedMetrics {
  // Aplicar filtro de período
  const filteredRevenue = filterByTimeframe(revenueSnapshots, timeframe).sort(
    (a, b) => toUtcDay(b.date).getTime() - toUtcDay(a.date).getTime(),
  );
  const filteredUsers = filterByTimeframe(userMetrics, timeframe).sort(
    (a, b) => toUtcDay(b.date).getTime() - toUtcDay(a.date).getTime(),
  );
  const filteredValuation = filterByTimeframe(valuationSnapshots, timeframe).sort(
    (a, b) => toUtcDay(b.date).getTime() - toUtcDay(a.date).getTime(),
  );
  
  // Dados mais recentes (já vem ordenado desc do banco)
  const latestRevenue = filteredRevenue[0];
  const previousRevenue = filteredRevenue[1];
  const latestUsers = filteredUsers[0];
  const previousUsers = filteredUsers[1];
  const latestValuation = filteredValuation[0];
  
  const hasRevenueData = filteredRevenue.length > 0;
  const hasUserData = filteredUsers.length > 0;
  const hasData = hasRevenueData || hasUserData;
  
  // Receita
  const mrr = latestRevenue?.mrr ?? null;
  const arr = latestRevenue?.arr ?? (mrr !== null ? mrr * 12 : null);
  const newMrr = latestRevenue?.new_mrr ?? null;
  const expansionMrr = latestRevenue?.expansion_mrr ?? null;
  const churnedMrr = latestRevenue?.churned_mrr ?? null;
  
  // Crescimento MRR
  const mrrGrowth = (mrr !== null && previousRevenue?.mrr && previousRevenue.mrr > 0)
    ? ((mrr - previousRevenue.mrr) / previousRevenue.mrr) * 100
    : null;
  
  // Usuários
  const totalUsers = latestUsers?.total_users ?? null;
  const newUsers = latestUsers?.new_users ?? null;
  const activeUsers = latestUsers?.active_users ?? null;
  const churnedUsers = latestUsers?.churned_users ?? null;
  
  // Crescimento de usuários
  const previousTotalUsers = previousUsers?.total_users ?? null;
  const userGrowth = (totalUsers !== null && previousTotalUsers !== null && previousTotalUsers > 0)
    ? ((totalUsers - previousTotalUsers) / previousTotalUsers) * 100
    : null;
  
  // Churn rate
  const churnRate = (churnedUsers !== null && totalUsers !== null && totalUsers > 0)
    ? (churnedUsers / totalUsers) * 100
    : null;
  
  // ARPU
  const arpu = (mrr !== null && activeUsers !== null && activeUsers > 0)
    ? mrr / activeUsers
    : null;
  
  // Média de signups diários
  const avgDailySignups = filteredUsers.length > 0
    ? (() => {
        const rates = filteredUsers.map((metric, index) => {
          const olderSnapshot = filteredUsers[index + 1];
          if (olderSnapshot) {
            return metric.new_users / diffDays(metric.date, olderSnapshot.date);
          }

          const newerSnapshot = filteredUsers[index - 1];
          if (newerSnapshot) {
            return metric.new_users / diffDays(newerSnapshot.date, metric.date);
          }

          return metric.new_users / 30;
        });

        return rates.reduce((sum, value) => sum + value, 0) / rates.length;
      })()
    : null;
  
  // Net New MRR
  const netNewMrr = (newMrr !== null || expansionMrr !== null || churnedMrr !== null)
    ? (newMrr ?? 0) + (expansionMrr ?? 0) - (churnedMrr ?? 0)
    : null;
  
  // Suggested multiple
  const suggestedMultiple = calculateSuggestedMultiple(mrrGrowth, userGrowth);
  
  // Valuation
  let valuation: number | null = latestValuation?.valuation ?? null;
  let valuationMultiple: number | null = latestValuation?.valuation_multiple ?? null;
  
  // Calculate dynamically if no snapshot exists
  if (valuation === null && arr !== null && arr > 0) {
    valuationMultiple = suggestedMultiple;
    valuation = arr * valuationMultiple;
  }
  
  // Forecasts (3, 6, 12 months)
  const monthlyGrowthRate = (() => {
    if (mrr !== null && previousRevenue?.mrr && previousRevenue.mrr > 0 && latestRevenue) {
      const growthFactor = mrr / previousRevenue.mrr;
      const elapsedDays = diffDays(latestRevenue.date, previousRevenue.date);
      const normalized = Math.pow(growthFactor, 30 / elapsedDays) - 1;

      if (Number.isFinite(normalized)) {
        return Math.max(-0.95, normalized);
      }
    }

    if (mrrGrowth !== null) {
      return mrrGrowth / 100;
    }

    return 0.05;
  })();
  const forecast3m = mrr !== null ? calculateForecast(mrr, monthlyGrowthRate, 3, valuationMultiple ?? suggestedMultiple) : null;
  const forecast6m = mrr !== null ? calculateForecast(mrr, monthlyGrowthRate, 6, valuationMultiple ?? suggestedMultiple) : null;
  const forecast12m = mrr !== null ? calculateForecast(mrr, monthlyGrowthRate, 12, valuationMultiple ?? suggestedMultiple) : null;
  
  return {
    mrr,
    arr,
    mrrGrowth,
    newMrr,
    expansionMrr,
    churnedMrr,
    netNewMrr,
    totalUsers,
    newUsers,
    activeUsers,
    churnedUsers,
    userGrowth,
    churnRate,
    arpu,
    avgDailySignups,
    valuation,
    valuationMultiple,
    suggestedMultiple,
    forecast3m,
    forecast6m,
    forecast12m,
    hasRevenueData,
    hasUserData,
    hasData,
  };
}

/**
 * Calcula valor de equity
 */
export function calculateEquityValue(
  valuation: number | null,
  arr: number | null,
  percentage: number,
  defaultMultiple: number = 10
): { value: number; usedValuation: number } {
  const usedValuation = valuation ?? (arr !== null ? arr * defaultMultiple : 0);
  const value = (usedValuation * percentage) / 100;
  return { value, usedValuation };
}
