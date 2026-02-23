import { useState } from "react";
import {
  BarChart3,
  DollarSign,
  Lock,
  Target,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { MoneyValue } from "@/components/ui/money-value";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type PreviewView = "overview" | "revenue" | "users" | "valuation";
type PreviewTimeframe = "30d" | "90d" | "12m";
const LOCKED_VIEWS: PreviewView[] = ["users", "valuation"];

interface PreviewDataset {
  mrr: number;
  mrrDelta: number;
  arr: number;
  arrDelta: number;
  netNewMrr: number;
  netNewMrrDelta: number;
  valuation: number;
  valuationMultiple: number;
  valuationDelta: number;
  totalUsers: number;
  userGrowth: number;
  churnRate: number;
  arpu: number;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  revenueSeries: number[];
  userSeries: number[];
  forecast: Array<{ label: string; mrr: number; arr: number; valuation: number }>;
}

const PREVIEW_DATA: Record<PreviewTimeframe, PreviewDataset> = {
  "30d": {
    mrr: 45200,
    mrrDelta: 12.5,
    arr: 542400,
    arrDelta: 12.5,
    netNewMrr: 4800,
    netNewMrrDelta: 8.2,
    valuation: 6508800,
    valuationMultiple: 12,
    valuationDelta: 9.8,
    totalUsers: 4820,
    userGrowth: 7.6,
    churnRate: 2.4,
    arpu: 14.8,
    newMrr: 5800,
    expansionMrr: 2500,
    churnedMrr: 1400,
    revenueSeries: [31, 35, 34, 38, 41, 43, 45, 44, 47, 49, 50, 52],
    userSeries: [58, 60, 61, 63, 65, 66, 68, 70, 71, 73, 74, 76],
    forecast: [
      { label: "3 months", mrr: 52000, arr: 624000, valuation: 7488000 },
      { label: "6 months", mrr: 61200, arr: 734400, valuation: 8812800 },
      { label: "12 months", mrr: 82000, arr: 984000, valuation: 11808000 },
    ],
  },
  "90d": {
    mrr: 43100,
    mrrDelta: 10.2,
    arr: 517200,
    arrDelta: 10.2,
    netNewMrr: 4300,
    netNewMrrDelta: 6.9,
    valuation: 6206400,
    valuationMultiple: 12,
    valuationDelta: 8.6,
    totalUsers: 4510,
    userGrowth: 6.8,
    churnRate: 2.5,
    arpu: 14.1,
    newMrr: 5300,
    expansionMrr: 2100,
    churnedMrr: 1300,
    revenueSeries: [28, 29, 31, 32, 34, 36, 37, 38, 40, 41, 42, 45],
    userSeries: [52, 53, 55, 57, 58, 60, 62, 63, 65, 66, 67, 69],
    forecast: [
      { label: "3 months", mrr: 49900, arr: 598800, valuation: 7185600 },
      { label: "6 months", mrr: 57800, arr: 693600, valuation: 8323200 },
      { label: "12 months", mrr: 76000, arr: 912000, valuation: 10944000 },
    ],
  },
  "12m": {
    mrr: 39800,
    mrrDelta: 8.4,
    arr: 477600,
    arrDelta: 8.4,
    netNewMrr: 3800,
    netNewMrrDelta: 5.5,
    valuation: 5731200,
    valuationMultiple: 12,
    valuationDelta: 7.2,
    totalUsers: 4200,
    userGrowth: 6.3,
    churnRate: 2.8,
    arpu: 13.9,
    newMrr: 4700,
    expansionMrr: 1900,
    churnedMrr: 1200,
    revenueSeries: [24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40],
    userSeries: [45, 46, 47, 49, 50, 52, 53, 55, 57, 58, 60, 62],
    forecast: [
      { label: "3 months", mrr: 45000, arr: 540000, valuation: 6480000 },
      { label: "6 months", mrr: 52500, arr: 630000, valuation: 7560000 },
      { label: "12 months", mrr: 69000, arr: 828000, valuation: 9936000 },
    ],
  },
};

const VIEW_ITEMS: Array<{
  value: PreviewView;
  label: string;
  icon: typeof BarChart3;
}> = [
  { value: "overview", label: "Dashboard", icon: BarChart3 },
  { value: "revenue", label: "Revenue", icon: DollarSign },
  { value: "users", label: "Users", icon: Users },
  { value: "valuation", label: "Valuation", icon: Target },
];

function PreviewBars({
  values,
  tone,
}: {
  values: number[];
  tone: "primary" | "chart-2";
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="h-36 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex h-full items-end gap-1.5">
        {values.map((value, index) => (
          <div
            key={`${tone}-${index}`}
            className={cn(
              "flex-1 rounded-t-md transition-all duration-500",
              tone === "primary" ? "bg-primary/70" : "bg-chart-2/70",
            )}
            style={{ height: `${Math.max(8, Math.round((value / max) * 100))}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-lg font-semibold text-foreground tabular-nums">{value}</div>
      <div className="mt-3">{typeof delta === "number" ? <DeltaBadge value={delta} /> : null}</div>
    </div>
  );
}

export function ProductExperiencePreview() {
  const navigate = useNavigate();
  const [view, setView] = useState<PreviewView>("overview");
  const [timeframe, setTimeframe] = useState<PreviewTimeframe>("30d");

  const data = PREVIEW_DATA[timeframe];
  const activeView = VIEW_ITEMS.find((item) => item.value === view) ?? VIEW_ITEMS[0];

  const handleViewChange = (nextView: PreviewView) => {
    if (LOCKED_VIEWS.includes(nextView)) {
      navigate("/auth");
      return;
    }
    setView(nextView);
  };

  const handleLockedClick = () => {
    navigate("/auth");
  };

  return (
    <div className="metric-card p-0 overflow-hidden">
      <div className="border-b border-border/70 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Product Experience Preview</p>
            <p className="text-sm text-muted-foreground">Minimal walkthrough of the real dashboard flow.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Demo</Badge>
          </div>
        </div>
      </div>

      <div className="border-b border-border/70 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl
            value={timeframe}
            onChange={setTimeframe}
            options={[
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
              { value: "12m", label: "12m" },
            ]}
          />
          <SegmentedControl
            value={view}
            onChange={handleViewChange}
            options={VIEW_ITEMS.map((item) => ({
              value: item.value,
              label: LOCKED_VIEWS.includes(item.value) ? `${item.label}*` : item.label,
            }))}
          />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {VIEW_ITEMS.map((item) => {
            const isLocked = LOCKED_VIEWS.includes(item.value);
            const isActive = item.value === view;
            return (
              <button
                key={item.value}
                type="button"
                onClick={isLocked ? handleLockedClick : () => setView(item.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {isLocked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          * Users and Valuation open the login flow.
        </div>

        {view === "overview" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile label="MRR" value={<MoneyValue value={data.mrr} size="xl" />} delta={data.mrrDelta} />
              <MetricTile label="ARR" value={<MoneyValue value={data.arr} size="xl" />} delta={data.arrDelta} />
              <MetricTile
                label="Valuation"
                value={<MoneyValue value={data.valuation} size="xl" abbreviate />}
                delta={data.valuationDelta}
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-sm font-medium text-foreground">Revenue Momentum</p>
              <p className="text-xs text-muted-foreground">Monthly recurring revenue trend ({timeframe})</p>
              <div className="mt-3">
                <PreviewBars values={data.revenueSeries} tone="primary" />
              </div>
            </div>
          </div>
        )}

        {view === "revenue" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile label="New MRR" value={<MoneyValue value={data.newMrr} size="xl" />} />
              <MetricTile label="Expansion MRR" value={<MoneyValue value={data.expansionMrr} size="xl" />} />
              <MetricTile label="Churned MRR" value={<MoneyValue value={data.churnedMrr} size="xl" />} />
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Revenue Growth</p>
                  <p className="text-xs text-muted-foreground">Net New MRR movement over time</p>
                </div>
                <DeltaBadge value={data.netNewMrrDelta} />
              </div>
              <PreviewBars values={data.revenueSeries} tone="primary" />
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          Active view: <span className="text-foreground">{activeView.label}</span> • Period:{" "}
          <span className="text-foreground">{timeframe}</span>
        </div>
      </div>
    </div>
  );
}
