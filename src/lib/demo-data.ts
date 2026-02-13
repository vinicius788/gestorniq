/**
 * Dados de demonstração para modo demo
 * Simula 12 meses de dados realistas de uma SaaS em crescimento
 */

import type { RevenueSnapshot, UserMetric, ValuationSnapshot } from './calculations';

const DEMO_COMPANY_ID = 'demo-company-id';

function generateDateMonthsAgo(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return date.toISOString().split('T')[0];
}

function generateId(prefix: string, index: number): string {
  return `${prefix}-demo-${index}`;
}

export function generateDemoRevenueSnapshots(): RevenueSnapshot[] {
  // Começando com MRR de 25k e crescendo ~8% ao mês
  const baseData = [
    { mrr: 25000, newMrr: 3500, expansionMrr: 1200, churnedMrr: 800 },
    { mrr: 27500, newMrr: 4000, expansionMrr: 1500, churnedMrr: 900 },
    { mrr: 29800, newMrr: 3800, expansionMrr: 1400, churnedMrr: 850 },
    { mrr: 32500, newMrr: 4500, expansionMrr: 1800, churnedMrr: 1000 },
    { mrr: 35200, newMrr: 4200, expansionMrr: 1600, churnedMrr: 950 },
    { mrr: 38000, newMrr: 4800, expansionMrr: 2000, churnedMrr: 1100 },
    { mrr: 41500, newMrr: 5500, expansionMrr: 2200, churnedMrr: 1200 },
    { mrr: 45200, newMrr: 5800, expansionMrr: 2500, churnedMrr: 1300 },
    { mrr: 48800, newMrr: 5200, expansionMrr: 2100, churnedMrr: 1150 },
    { mrr: 52500, newMrr: 6000, expansionMrr: 2400, churnedMrr: 1250 },
    { mrr: 56800, newMrr: 6500, expansionMrr: 2700, churnedMrr: 1400 },
    { mrr: 61200, newMrr: 7000, expansionMrr: 3000, churnedMrr: 1500 },
  ];

  return baseData.map((data, index) => ({
    id: generateId('rev', index),
    company_id: DEMO_COMPANY_ID,
    date: generateDateMonthsAgo(11 - index),
    mrr: data.mrr,
    arr: data.mrr * 12,
    new_mrr: data.newMrr,
    expansion_mrr: data.expansionMrr,
    churned_mrr: data.churnedMrr,
    source: 'demo',
    created_at: new Date().toISOString(),
  })).reverse(); // Mais recente primeiro
}

export function generateDemoUserMetrics(): UserMetric[] {
  // Começando com 1500 usuários e crescendo
  const baseData = [
    { total: 1500, new: 180, active: 920, churned: 45 },
    { total: 1680, new: 220, active: 1020, churned: 50 },
    { total: 1890, new: 260, active: 1150, churned: 55 },
    { total: 2120, new: 290, active: 1300, churned: 60 },
    { total: 2380, new: 320, active: 1450, churned: 65 },
    { total: 2650, new: 340, active: 1600, churned: 70 },
    { total: 2950, new: 380, active: 1780, churned: 75 },
    { total: 3280, new: 420, active: 1980, churned: 80 },
    { total: 3620, new: 450, active: 2200, churned: 85 },
    { total: 3980, new: 480, active: 2420, churned: 90 },
    { total: 4380, new: 520, active: 2660, churned: 95 },
    { total: 4820, new: 560, active: 2920, churned: 100 },
  ];

  return baseData.map((data, index) => ({
    id: generateId('usr', index),
    company_id: DEMO_COMPANY_ID,
    date: generateDateMonthsAgo(11 - index),
    total_users: data.total,
    new_users: data.new,
    active_users: data.active,
    churned_users: data.churned,
    source: 'demo',
    created_at: new Date().toISOString(),
  })).reverse(); // Mais recente primeiro
}

export function generateDemoValuationSnapshots(): ValuationSnapshot[] {
  const revenueSnapshots = generateDemoRevenueSnapshots();
  
  return revenueSnapshots.slice(0, 6).map((rev, index) => {
    const prevRev = revenueSnapshots[index + 1];
    const mrrGrowth = prevRev ? ((rev.mrr - prevRev.mrr) / prevRev.mrr) * 100 : 8;
    const multiple = 12 + (mrrGrowth > 10 ? 3 : mrrGrowth > 5 ? 1 : 0);
    
    return {
      id: generateId('val', index),
      company_id: DEMO_COMPANY_ID,
      date: rev.date,
      mrr_growth_rate: mrrGrowth,
      user_growth_rate: 10 + Math.random() * 5,
      valuation_multiple: multiple,
      arr: rev.arr,
      valuation: rev.arr * multiple,
      created_at: new Date().toISOString(),
    };
  });
}

export interface DemoData {
  revenueSnapshots: RevenueSnapshot[];
  userMetrics: UserMetric[];
  valuationSnapshots: ValuationSnapshot[];
}

export function generateDemoData(): DemoData {
  return {
    revenueSnapshots: generateDemoRevenueSnapshots(),
    userMetrics: generateDemoUserMetrics(),
    valuationSnapshots: generateDemoValuationSnapshots(),
  };
}
