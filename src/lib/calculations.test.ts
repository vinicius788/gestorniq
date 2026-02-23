import { describe, expect, it } from "vitest";

import {
  calculateEquityValue,
  calculateMetrics,
  calculateSuggestedMultiple,
  calculateUserCadenceMetrics,
  filterByTimeframe,
  type RevenueSnapshot,
  type UserMetric,
  type ValuationSnapshot,
} from "@/lib/calculations";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function makeRevenueSnapshot(
  overrides: Partial<RevenueSnapshot>,
): RevenueSnapshot {
  return {
    id: "rev-1",
    company_id: "company-1",
    date: isoDaysAgo(0),
    mrr: 0,
    arr: 0,
    new_mrr: 0,
    expansion_mrr: 0,
    churned_mrr: 0,
    source: "manual",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeUserMetric(overrides: Partial<UserMetric>): UserMetric {
  return {
    id: "usr-1",
    company_id: "company-1",
    date: isoDaysAgo(0),
    total_users: 0,
    new_users: 0,
    active_users: 0,
    churned_users: 0,
    source: "manual",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("filterByTimeframe", () => {
  it("returns only recent entries for 30 days", () => {
    const data = [
      { date: isoDaysAgo(10), value: 1 },
      { date: isoDaysAgo(70), value: 2 },
    ];

    const filtered = filterByTimeframe(data, "30d");

    expect(filtered).toEqual([{ date: isoDaysAgo(10), value: 1 }]);
  });

  it("returns all entries when timeframe is all", () => {
    const data = [{ date: isoDaysAgo(1) }, { date: isoDaysAgo(120) }];
    expect(filterByTimeframe(data, "all")).toEqual(data);
  });
});

describe("calculateSuggestedMultiple", () => {
  it("keeps base multiple when there is no growth data", () => {
    expect(calculateSuggestedMultiple(null, null)).toBe(5);
  });

  it("applies revenue/user contribution and balance bonus", () => {
    expect(calculateSuggestedMultiple(30, 30)).toBe(16);
  });

  it("applies PMF bonus for user-led growth", () => {
    expect(calculateSuggestedMultiple(5, 12)).toBe(9.8);
  });
});

describe("calculateMetrics", () => {
  it("computes core SaaS metrics from latest and previous snapshots", () => {
    const revenueSnapshots: RevenueSnapshot[] = [
      makeRevenueSnapshot({
        id: "rev-latest",
        date: isoDaysAgo(0),
        mrr: 1200,
        arr: 14400,
        new_mrr: 300,
        expansion_mrr: 100,
        churned_mrr: 50,
      }),
      makeRevenueSnapshot({
        id: "rev-prev",
        date: isoDaysAgo(30),
        mrr: 1000,
        arr: 12000,
        new_mrr: 240,
        expansion_mrr: 80,
        churned_mrr: 40,
      }),
    ];

    const userMetrics: UserMetric[] = [
      makeUserMetric({
        id: "usr-latest",
        date: isoDaysAgo(0),
        total_users: 200,
        new_users: 30,
        active_users: 150,
        churned_users: 10,
      }),
      makeUserMetric({
        id: "usr-prev",
        date: isoDaysAgo(30),
        total_users: 160,
        new_users: 20,
        active_users: 130,
        churned_users: 8,
      }),
    ];

    const valuationSnapshots: ValuationSnapshot[] = [];

    const result = calculateMetrics(
      revenueSnapshots,
      userMetrics,
      valuationSnapshots,
      "all",
    );

    expect(result.mrr).toBe(1200);
    expect(result.arr).toBe(14400);
    expect(result.mrrGrowth).toBe(20);
    expect(result.userGrowth).toBe(25);
    expect(result.churnRate).toBe(5);
    expect(result.arpu).toBe(8);
    expect(result.netNewMrr).toBe(350);
    expect(result.avgDailySignups).toBeCloseTo(0.8333, 4);
    expect(result.suggestedMultiple).toBe(13.5);
    expect(result.valuationMultiple).toBe(13.5);
    expect(result.valuation).toBe(194400);
    expect(result.forecast3m?.months).toBe(3);
    expect(result.forecast6m?.months).toBe(6);
    expect(result.forecast12m?.months).toBe(12);
    expect(result.hasRevenueData).toBe(true);
    expect(result.hasUserData).toBe(true);
    expect(result.hasData).toBe(true);
  });

  it("uses saved valuation snapshot when available", () => {
    const revenueSnapshots = [
      makeRevenueSnapshot({
        date: isoDaysAgo(0),
        mrr: 1000,
        arr: 12000,
      }),
    ];
    const userMetrics = [makeUserMetric({ date: isoDaysAgo(0), total_users: 100 })];
    const valuationSnapshots: ValuationSnapshot[] = [
      {
        id: "val-1",
        company_id: "company-1",
        date: isoDaysAgo(0),
        mrr_growth_rate: 8,
        user_growth_rate: 9,
        valuation_multiple: 11,
        arr: 12000,
        valuation: 132000,
        created_at: new Date().toISOString(),
      },
    ];

    const result = calculateMetrics(
      revenueSnapshots,
      userMetrics,
      valuationSnapshots,
      "all",
    );

    expect(result.valuationMultiple).toBe(11);
    expect(result.valuation).toBe(132000);
  });

  it("normalizes growth for forecast when snapshots are not exactly 30 days apart", () => {
    const revenueSnapshots: RevenueSnapshot[] = [
      makeRevenueSnapshot({
        id: "rev-latest",
        date: isoDaysAgo(0),
        mrr: 1200,
        arr: 14400,
      }),
      makeRevenueSnapshot({
        id: "rev-prev",
        date: isoDaysAgo(60),
        mrr: 1000,
        arr: 12000,
      }),
    ];

    const result = calculateMetrics(revenueSnapshots, [], [], "all");

    expect(result.mrrGrowth).toBeCloseTo(20, 5);
    expect(result.forecast6m?.mrr).toBe(2074);
    expect(result.forecast6m?.arr).toBe(24883);
  });
});

describe("calculateUserCadenceMetrics", () => {
  it("derives daily, weekly, monthly cadence from snapshot spacing", () => {
    const userMetrics: UserMetric[] = [
      makeUserMetric({
        id: "usr-latest",
        date: isoDaysAgo(0),
        new_users: 62,
      }),
      makeUserMetric({
        id: "usr-prev",
        date: isoDaysAgo(31),
        new_users: 31,
      }),
      makeUserMetric({
        id: "usr-prev-2",
        date: isoDaysAgo(61),
        new_users: 30,
      }),
    ];

    const cadence = calculateUserCadenceMetrics(userMetrics);

    expect(cadence.daily.value).toBeCloseTo(2, 3);
    expect(cadence.weekly.value).toBeCloseTo(14, 3);
    expect(cadence.monthly.value).toBeCloseTo(60, 3);
    expect(cadence.daily.change).toBeCloseTo(93.548, 3);
  });

  it("returns null cadence when there are fewer than two snapshots", () => {
    const cadence = calculateUserCadenceMetrics([
      makeUserMetric({ id: "usr-only", new_users: 10 }),
    ]);

    expect(cadence.daily.value).toBeNull();
    expect(cadence.weekly.value).toBeNull();
    expect(cadence.monthly.value).toBeNull();
  });
});

describe("calculateEquityValue", () => {
  it("falls back to ARR x default multiple when valuation is missing", () => {
    const result = calculateEquityValue(null, 12000, 10, 10);
    expect(result.usedValuation).toBe(120000);
    expect(result.value).toBe(12000);
  });

  it("uses explicit valuation when provided", () => {
    const result = calculateEquityValue(500000, 12000, 2);
    expect(result.usedValuation).toBe(500000);
    expect(result.value).toBe(10000);
  });
});
