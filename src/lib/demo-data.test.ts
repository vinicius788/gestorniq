import { describe, expect, it } from "vitest";

import {
  generateDemoData,
  generateDemoRevenueSnapshots,
  generateDemoUserMetrics,
  generateDemoValuationSnapshots,
} from "@/lib/demo-data";

describe("generateDemoRevenueSnapshots", () => {
  it("returns 12 snapshots sorted from latest to oldest", () => {
    const snapshots = generateDemoRevenueSnapshots();

    expect(snapshots).toHaveLength(12);

    snapshots.forEach((snapshot) => {
      expect(snapshot.source).toBe("demo");
      expect(snapshot.arr).toBe(snapshot.mrr * 12);
    });

    for (let index = 1; index < snapshots.length; index += 1) {
      const previous = new Date(snapshots[index - 1].date).getTime();
      const current = new Date(snapshots[index].date).getTime();
      expect(previous).toBeGreaterThanOrEqual(current);
    }
  });
});

describe("generateDemoUserMetrics", () => {
  it("returns 12 user snapshots in demo mode format", () => {
    const snapshots = generateDemoUserMetrics();

    expect(snapshots).toHaveLength(12);

    snapshots.forEach((snapshot) => {
      expect(snapshot.source).toBe("demo");
      expect(snapshot.active_users).toBeLessThanOrEqual(snapshot.total_users);
      expect(snapshot.new_users).toBeGreaterThan(0);
    });
  });
});

describe("generateDemoValuationSnapshots", () => {
  it("builds valuation snapshots tied to revenue snapshots", () => {
    const snapshots = generateDemoValuationSnapshots();

    expect(snapshots).toHaveLength(6);
    snapshots.forEach((snapshot) => {
      expect(snapshot.valuation).toBe(snapshot.arr * snapshot.valuation_multiple);
      expect(snapshot.valuation_multiple).toBeGreaterThanOrEqual(12);
      expect(snapshot.user_growth_rate).toBeGreaterThanOrEqual(10);
      expect(snapshot.user_growth_rate).toBeLessThanOrEqual(15);
    });
  });
});

describe("generateDemoData", () => {
  it("returns a complete demo dataset", () => {
    const data = generateDemoData();

    expect(data.revenueSnapshots).toHaveLength(12);
    expect(data.userMetrics).toHaveLength(12);
    expect(data.valuationSnapshots).toHaveLength(6);
  });
});
