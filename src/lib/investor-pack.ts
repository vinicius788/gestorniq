import { CURRENCY_CONFIG, formatCurrencySimple, formatPercent, type Currency } from "@/lib/format";
import type {
  CalculatedMetrics,
  RevenueSnapshot,
  UserMetric,
  ValuationSnapshot,
} from "@/lib/calculations";

interface InvestorPackPayload {
  companyName: string;
  currency: Currency;
  generatedAt: Date;
  metrics: CalculatedMetrics;
  revenueSnapshots: RevenueSnapshot[];
  userMetrics: UserMetric[];
  valuationSnapshots: ValuationSnapshot[];
}

const CSV_MIME_TYPE = "text/csv;charset=utf-8;";

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function getForecastRows(metrics: CalculatedMetrics) {
  return [
    ["3 months", metrics.forecast3m?.mrr ?? null, metrics.forecast3m?.arr ?? null, metrics.forecast3m?.valuation ?? null],
    ["6 months", metrics.forecast6m?.mrr ?? null, metrics.forecast6m?.arr ?? null, metrics.forecast6m?.valuation ?? null],
    ["12 months", metrics.forecast12m?.mrr ?? null, metrics.forecast12m?.arr ?? null, metrics.forecast12m?.valuation ?? null],
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatGeneratedAt(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildInvestorPackCsv(payload: InvestorPackPayload): string {
  const { companyName, generatedAt, currency, metrics, revenueSnapshots, userMetrics, valuationSnapshots } = payload;
  const locale = CURRENCY_CONFIG[currency].locale;

  const rows: Array<Array<string | number | null | undefined>> = [
    ["Investor Pack", companyName],
    ["Generated at", formatGeneratedAt(generatedAt, locale)],
    ["Currency", currency],
    [],
    ["Executive Summary"],
    ["Metric", "Value"],
    ["MRR", metrics.mrr],
    ["ARR", metrics.arr],
    ["Net New MRR", metrics.netNewMrr],
    ["Revenue Growth (%)", metrics.mrrGrowth],
    ["Total Users", metrics.totalUsers],
    ["User Growth (%)", metrics.userGrowth],
    ["Churn Rate (%)", metrics.churnRate],
    ["ARPU", metrics.arpu],
    ["Valuation", metrics.valuation],
    ["Valuation Multiple", metrics.valuationMultiple],
    [],
    ["Forecast (3/6/12 months)"],
    ["Horizon", "Projected MRR", "Projected ARR", "Projected Valuation"],
    ...getForecastRows(metrics),
    [],
    ["Revenue Snapshots"],
    ["Date", "MRR", "ARR", "New MRR", "Expansion MRR", "Churned MRR", "Source"],
    ...revenueSnapshots.map((snapshot) => [
      snapshot.date,
      snapshot.mrr,
      snapshot.arr,
      snapshot.new_mrr,
      snapshot.expansion_mrr,
      snapshot.churned_mrr,
      snapshot.source,
    ]),
    [],
    ["User Snapshots"],
    ["Date", "Total Users", "New Users", "Active Users", "Churned Users", "Source"],
    ...userMetrics.map((metric) => [
      metric.date,
      metric.total_users,
      metric.new_users,
      metric.active_users,
      metric.churned_users,
      metric.source,
    ]),
    [],
    ["Valuation Snapshots"],
    ["Date", "ARR", "Valuation Multiple", "Valuation", "MRR Growth (%)", "User Growth (%)"],
    ...valuationSnapshots.map((snapshot) => [
      snapshot.date,
      snapshot.arr,
      snapshot.valuation_multiple,
      snapshot.valuation,
      snapshot.mrr_growth_rate,
      snapshot.user_growth_rate,
    ]),
  ];

  return toCsv(rows);
}

function makeMetricRow(label: string, value: string) {
  return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function makeTable(title: string, headers: string[], rows: string[][]) {
  return `
    <section class="section">
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

export function buildInvestorPackHtml(payload: InvestorPackPayload): string {
  const { companyName, generatedAt, currency, metrics, revenueSnapshots, userMetrics, valuationSnapshots } = payload;
  const locale = CURRENCY_CONFIG[currency].locale;

  const money = (value: number | null | undefined, compact = false) => formatCurrencySimple(value, currency, compact);
  const percent = (value: number | null | undefined) => formatPercent(value, { decimals: 1, showSign: true });
  const number = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : new Intl.NumberFormat(locale).format(value);

  const summaryRows = [
    makeMetricRow("MRR", money(metrics.mrr)),
    makeMetricRow("ARR", money(metrics.arr)),
    makeMetricRow("Net New MRR", money(metrics.netNewMrr)),
    makeMetricRow("Revenue Growth", percent(metrics.mrrGrowth)),
    makeMetricRow("Total Users", number(metrics.totalUsers)),
    makeMetricRow("User Growth", percent(metrics.userGrowth)),
    makeMetricRow("Churn Rate", percent(metrics.churnRate)),
    makeMetricRow("ARPU", money(metrics.arpu)),
    makeMetricRow("Valuation", money(metrics.valuation, true)),
    makeMetricRow("Valuation Multiple", metrics.valuationMultiple ? `${metrics.valuationMultiple}x` : "—"),
  ].join("");

  const forecastRows = getForecastRows(metrics).map(([horizon, mrr, arr, valuation]) => [
    String(horizon),
    money(mrr as number | null | undefined),
    money(arr as number | null | undefined),
    money(valuation as number | null | undefined, true),
  ]);

  const revenueRows = revenueSnapshots.slice(0, 24).map((snapshot) => [
    snapshot.date,
    money(snapshot.mrr),
    money(snapshot.arr),
    money(snapshot.new_mrr),
    money(snapshot.expansion_mrr),
    money(snapshot.churned_mrr),
    snapshot.source,
  ]);

  const userRows = userMetrics.slice(0, 24).map((metric) => [
    metric.date,
    number(metric.total_users),
    number(metric.new_users),
    number(metric.active_users),
    number(metric.churned_users),
    metric.source,
  ]);

  const valuationRows = valuationSnapshots.slice(0, 24).map((snapshot) => [
    snapshot.date,
    money(snapshot.arr),
    `${snapshot.valuation_multiple}x`,
    money(snapshot.valuation, true),
    percent(snapshot.mrr_growth_rate),
    percent(snapshot.user_growth_rate),
  ]);

  return `
    <div class="wrapper">
      <header>
        <h1>Investor Pack</h1>
        <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
        <p><strong>Generated:</strong> ${escapeHtml(formatGeneratedAt(generatedAt, locale))}</p>
        <p><strong>Currency:</strong> ${escapeHtml(currency)}</p>
      </header>

      <section class="section">
        <h3>Executive Summary</h3>
        <table>
          <tbody>${summaryRows}</tbody>
        </table>
      </section>

      ${makeTable("Forecast (3/6/12 months)", ["Horizon", "Projected MRR", "Projected ARR", "Projected Valuation"], forecastRows)}
      ${makeTable("Revenue Snapshots (last 24)", ["Date", "MRR", "ARR", "New MRR", "Expansion MRR", "Churned MRR", "Source"], revenueRows)}
      ${makeTable("User Snapshots (last 24)", ["Date", "Total Users", "New Users", "Active Users", "Churned Users", "Source"], userRows)}
      ${makeTable("Valuation Snapshots (last 24)", ["Date", "ARR", "Multiple", "Valuation", "MRR Growth", "User Growth"], valuationRows)}
    </div>
  `;
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: CSV_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function openInvestorPackPrintWindow(title: string, bodyHtml: string): void {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=900");
  if (!printWindow) {
    throw new Error("Could not open print window");
  }

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
          .wrapper { max-width: 980px; margin: 0 auto; }
          header { margin-bottom: 24px; }
          h1 { margin: 0 0 8px 0; font-size: 28px; }
          h3 { margin: 0 0 12px 0; font-size: 18px; }
          p { margin: 0 0 4px 0; font-size: 14px; }
          .section { margin-top: 24px; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 600; }
          @media print {
            body { margin: 0; }
            .wrapper { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
