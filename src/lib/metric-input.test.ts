import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/csv";
import { normalizeRevenueSnapshotInput, normalizeUserMetricInput } from "@/lib/metric-input";

describe("normalizeRevenueSnapshotInput", () => {
  it("parses currency and grouped numeric strings", () => {
    const normalized = normalizeRevenueSnapshotInput({
      date: "2026-02-01",
      mrr: "$45,000.50",
      new_mrr: "3,500",
      expansion_mrr: "1.250,25",
      churned_mrr: "500",
      source: "csv",
    });

    expect(normalized.mrr).toBe(45000.5);
    expect(normalized.new_mrr).toBe(3500);
    expect(normalized.expansion_mrr).toBe(1250.25);
    expect(normalized.churned_mrr).toBe(500);
  });

  it("rejects negative monetary values", () => {
    expect(() =>
      normalizeRevenueSnapshotInput({
        date: "2026-02-01",
        mrr: "-10",
        new_mrr: "0",
        expansion_mrr: "0",
        churned_mrr: "0",
      }),
    ).toThrow(/cannot be negative/i);
  });
});

describe("normalizeUserMetricInput", () => {
  it("enforces active/churned against total users", () => {
    expect(() =>
      normalizeUserMetricInput({
        date: "2026-02-01",
        total_users: 100,
        new_users: 20,
        active_users: 120,
        churned_users: 5,
      }),
    ).toThrow(/active users cannot exceed total users/i);
  });
});

describe("parseCsv", () => {
  it("supports quoted values and delimiters", () => {
    const rows = parseCsv(`date,mrr,new_mrr\n2026-02-01,"45,000",3500`);
    expect(rows).toHaveLength(1);
    expect(rows[0].mrr).toBe("45,000");
  });
});
