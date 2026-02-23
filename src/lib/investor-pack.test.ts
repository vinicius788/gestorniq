import { describe, expect, it, vi } from "vitest";

import type {
  CalculatedMetrics,
  RevenueSnapshot,
  UserMetric,
  ValuationSnapshot,
} from "@/lib/calculations";
import {
  buildInvestorPackCsv,
  buildInvestorPackHtml,
  openInvestorPackPrintWindow,
} from "@/lib/investor-pack";
import type { Currency } from "@/lib/format";

function makeMetrics(): CalculatedMetrics {
  return {
    mrr: 1200,
    arr: 14400,
    mrrGrowth: 20,
    newMrr: 300,
    expansionMrr: 100,
    churnedMrr: 50,
    netNewMrr: 350,
    totalUsers: 200,
    newUsers: 30,
    activeUsers: 150,
    churnedUsers: 10,
    userGrowth: 25,
    churnRate: 5,
    arpu: 8,
    avgDailySignups: 1,
    valuation: 194400,
    valuationMultiple: 13.5,
    suggestedMultiple: 13.5,
    forecast3m: { months: 3, mrr: 1500, arr: 18000, valuation: 243000 },
    forecast6m: { months: 6, mrr: 1800, arr: 21600, valuation: 291600 },
    forecast12m: { months: 12, mrr: 2500, arr: 30000, valuation: 405000 },
    hasRevenueData: true,
    hasUserData: true,
    hasData: true,
  };
}

function makeRevenueSnapshots(): RevenueSnapshot[] {
  return [
    {
      id: "rev-1",
      company_id: "company-1",
      date: "2026-01-31",
      mrr: 1200,
      arr: 14400,
      new_mrr: 300,
      expansion_mrr: 100,
      churned_mrr: 50,
      source: "api,manual",
      created_at: new Date().toISOString(),
    },
  ];
}

function makeUserMetrics(): UserMetric[] {
  return [
    {
      id: "usr-1",
      company_id: "company-1",
      date: "2026-01-31",
      total_users: 200,
      new_users: 30,
      active_users: 150,
      churned_users: 10,
      source: "<b>manual</b>",
      created_at: new Date().toISOString(),
    },
  ];
}

function makeValuationSnapshots(): ValuationSnapshot[] {
  return [
    {
      id: "val-1",
      company_id: "company-1",
      date: "2026-01-31",
      mrr_growth_rate: 20,
      user_growth_rate: 25,
      valuation_multiple: 13.5,
      arr: 14400,
      valuation: 194400,
      created_at: new Date().toISOString(),
    },
  ];
}

function makePayload(overrides?: { companyName?: string; currency?: Currency }) {
  return {
    companyName: overrides?.companyName ?? 'ACME, "Labs"',
    currency: overrides?.currency ?? "USD",
    generatedAt: new Date("2026-02-19T12:00:00Z"),
    metrics: makeMetrics(),
    revenueSnapshots: makeRevenueSnapshots(),
    userMetrics: makeUserMetrics(),
    valuationSnapshots: makeValuationSnapshots(),
  };
}

describe("buildInvestorPackCsv", () => {
  it("escapes CSV values with comma/quotes and keeps forecast rows", () => {
    const csv = buildInvestorPackCsv(makePayload());

    expect(csv).toContain('Investor Pack,"ACME, ""Labs"""');
    expect(csv).toContain('3 months,1500,18000,243000');
    expect(csv).toContain('"api,manual"');
  });
});

describe("buildInvestorPackHtml", () => {
  it("escapes user-provided HTML-sensitive content", () => {
    const html = buildInvestorPackHtml(
      makePayload({ companyName: "<script>alert(1)</script>" }),
    );

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;b&gt;manual&lt;/b&gt;");
  });
});

describe("openInvestorPackPrintWindow", () => {
  it("throws a clear error when popup cannot be opened", () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValueOnce(null as unknown as Window);

    expect(() =>
      openInvestorPackPrintWindow("Investor Pack", "<div>body</div>"),
    ).toThrow("Could not open print window");

    openSpy.mockRestore();
  });
});
