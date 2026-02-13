/**
 * Módulo centralizado de cálculos - Fonte única de verdade para todas as métricas
 */

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

/**
 * Filtra snapshots por período
 */
export function filterByTimeframe<T extends { date: string }>(
  data: T[],
  timeframe: Timeframe
): T[] {
  if (timeframe === 'all') return data;
  
  const now = new Date();
  let cutoffDate: Date;
  
  switch (timeframe) {
    case '30d':
      cutoffDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case '90d':
      cutoffDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case '12m':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 12));
      break;
    default:
      return data;
  }
  
  return data.filter(item => new Date(item.date) >= cutoffDate);
}

/**
 * Calcula o múltiplo de valuation sugerido baseado em crescimento
 */
export function calculateSuggestedMultiple(
  mrrGrowth: number | null,
  userGrowth: number | null
): number {
  const revGrowth = mrrGrowth ?? 0;
  const usrGrowth = userGrowth ?? 0;
  
  // Base: 5x
  let multiple = 5;
  
  // Contribuição de receita (0-30% = 0-5x)
  multiple += Math.min(revGrowth / 6, 5);
  
  // Contribuição de usuários (0-30% = 0-5x)
  multiple += Math.min(usrGrowth / 6, 5);
  
  // Bônus PMF: alto crescimento de usuários com receita moderada
  if (usrGrowth > 10 && revGrowth < 10) {
    multiple += 2;
  }
  
  // Bônus equilíbrio
  if (revGrowth > 5 && usrGrowth > 5) {
    multiple += 1;
  }
  
  return Math.round(multiple * 10) / 10;
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
  const filteredRevenue = filterByTimeframe(revenueSnapshots, timeframe);
  const filteredUsers = filterByTimeframe(userMetrics, timeframe);
  const filteredValuation = filterByTimeframe(valuationSnapshots, timeframe);
  
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
  const mrrGrowth = (mrr !== null && previousRevenue?.mrr)
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
    ? filteredUsers.reduce((sum, m) => sum + m.new_users, 0) / filteredUsers.length / 30
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
  const monthlyGrowthRate = mrrGrowth !== null ? mrrGrowth / 100 : 0.05; // default 5%
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
