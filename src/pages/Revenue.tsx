import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DollarSign, TrendingUp, Plus, Upload, Loader2, X } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyValue } from "@/components/ui/money-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatDate, type Currency } from "@/lib/format";
import { timeframeLabels } from "@/lib/formatters";
import { parseCsv } from "@/lib/csv";
import {
  normalizeRevenueSnapshotInput,
  type RevenueSnapshotInput,
} from "@/lib/metric-input";

const TODAY = () => new Date().toISOString().split("T")[0];

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function Revenue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { company } = useCompany();
  const { metrics, revenueSnapshots, filteredRevenueSnapshots, addRevenueSnapshot, addRevenueSnapshots, loading } = useMetrics();
  const { isDemoMode, timeframe } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csvData, setCsvData] = useState<RevenueSnapshotInput[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    date: TODAY(),
    mrr: '',
    new_mrr: '',
    expansion_mrr: '',
    churned_mrr: '',
  });

  const currency = (company?.currency || 'USD') as Currency;
  const timeframeLabel = timeframeLabels[timeframe] ?? timeframe;
  const hasHistoricalDataOutsideTimeframe = filteredRevenueSnapshots.length === 0 && revenueSnapshots.length > 0;

  const getSourceLabel = (source: string | null | undefined) => {
    const normalized = (source || "manual").toLowerCase();

    if (normalized === "demo") return "Demo";
    if (normalized === "csv") return "CSV";
    if (normalized === "manual") return "Manual";
    if (normalized === "stripe") return "Stripe";

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    if (action === "add") {
      setShowForm(true);
    }

    if (action === "import") {
      fileInputRef.current?.click();
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mrr) {
      toast.error('MRR is required');
      return;
    }

    if (isDemoMode) {
      toast.error('Cannot add data in demo mode');
      return;
    }

    setSubmitting(true);
    try {
      const normalized = normalizeRevenueSnapshotInput({
        date: formData.date,
        mrr: formData.mrr,
        new_mrr: formData.new_mrr,
        expansion_mrr: formData.expansion_mrr,
        churned_mrr: formData.churned_mrr,
        source: 'manual',
      });

      await addRevenueSnapshot(normalized);
      toast.success('Revenue data saved!');
      setShowForm(false);
      setFormData({
        date: TODAY(),
        mrr: '',
        new_mrr: '',
        expansion_mrr: '',
        churned_mrr: '',
      });
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Error saving data'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsv(text);
        const parsed: RevenueSnapshotInput[] = [];
        const validationErrors: string[] = [];

        rows.forEach((row, index) => {
          try {
            const normalized = normalizeRevenueSnapshotInput({
              date: row.date || row.data || TODAY(),
              mrr: row.mrr || row.total_mrr || 0,
              new_mrr: row.new_mrr || row.novo_mrr || 0,
              expansion_mrr: row.expansion_mrr || row.expansao_mrr || 0,
              churned_mrr: row.churned_mrr || row.churn_mrr || 0,
              source: 'csv',
            });
            parsed.push(normalized);
          } catch (rowError) {
            validationErrors.push(`Row ${index + 2}: ${getErrorMessage(rowError, 'Invalid data')}`);
          }
        });

        if (parsed.length === 0) {
          toast.error('No valid rows found in CSV');
          setCsvData([]);
          setCsvErrors(validationErrors);
          setShowCsvImport(false);
          return;
        }

        setCsvData(parsed);
        setCsvErrors(validationErrors);
        setShowCsvImport(true);

        if (validationErrors.length > 0) {
          toast.warning(`${parsed.length} valid rows loaded. ${validationErrors.length} rows were skipped.`);
        } else {
          toast.success(`${parsed.length} rows imported`);
        }
      } catch (csvError) {
        toast.error(getErrorMessage(csvError, 'Error processing CSV'));
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (isDemoMode) {
      toast.error('Cannot import data in demo mode');
      return;
    }

    setSubmitting(true);
    try {
      await addRevenueSnapshots(csvData);
      toast.success('Data imported successfully!');
      setShowCsvImport(false);
      setCsvData([]);
      setCsvErrors([]);
    } catch (importError) {
      toast.error(getErrorMessage(importError, 'Error importing data'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">
            Revenue breakdown and analytics
            {isDemoMode && <span className="ml-2 text-warning">(Demo Mode)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDemoMode}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowForm(!showForm)}
            disabled={isDemoMode}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Revenue
          </Button>
        </div>
      </div>

      {/* CSV Import Preview */}
      {showCsvImport && (
        <div className="metric-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Import Preview</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCsvImport(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{csvData.length} valid records to import</p>
          {csvErrors.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning-foreground">
              <p className="font-medium">{csvErrors.length} rows skipped due to validation errors.</p>
              <p className="mt-1 text-xs text-muted-foreground">{csvErrors.slice(0, 3).join(' • ')}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleImportCsv} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Import'}
            </Button>
            <Button variant="outline" onClick={() => setShowCsvImport(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Revenue Form */}
      {showForm && (
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Add Revenue Snapshot</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total MRR *</label>
              <Input
                type="number"
                placeholder="45000"
                value={formData.mrr}
                onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">New MRR</label>
              <Input
                type="number"
                placeholder="8000"
                value={formData.new_mrr}
                onChange={(e) => setFormData({ ...formData, new_mrr: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expansion MRR</label>
              <Input
                type="number"
                placeholder="3000"
                value={formData.expansion_mrr}
                onChange={(e) => setFormData({ ...formData, expansion_mrr: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Churned MRR</label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.churned_mrr}
                onChange={(e) => setFormData({ ...formData, churned_mrr: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="lg:col-span-5 flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          value={<MoneyValue value={metrics.mrr} currency={currency} size="3xl" />}
          change={metrics.hasRevenueData ? metrics.mrrGrowth : undefined}
          icon={DollarSign}
        />
        <MetricCard
          title="New MRR"
          value={<MoneyValue value={metrics.newMrr} currency={currency} size="3xl" />}
          icon={TrendingUp}
        />
        <MetricCard
          title="Expansion MRR"
          value={<MoneyValue value={metrics.expansionMrr} currency={currency} size="3xl" />}
          icon={DollarSign}
        />
        <MetricCard
          title="Churned MRR"
          value={<MoneyValue value={metrics.churnedMrr} currency={currency} size="3xl" />}
          icon={DollarSign}
        />
      </div>

      {metrics.hasRevenueData && <RevenueChart />}

      {/* History Table */}
      <div className="metric-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Revenue History</h3>
          <span className="text-xs text-muted-foreground">Showing: {timeframeLabel}</span>
        </div>
        {filteredRevenueSnapshots.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {hasHistoricalDataOutsideTimeframe
              ? "No revenue snapshots in the selected timeframe. Change timeframe to view older entries."
              : 'No revenue data. Click "Add Revenue" to get started.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">MRR</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">ARR</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">New</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Expansion</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Churn</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenueSnapshots.slice(0, 10).map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2 text-sm text-foreground whitespace-nowrap">
                      {formatDate(snapshot.date)}
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground text-right font-medium whitespace-nowrap tabular-nums">
                      <MoneyValue value={snapshot.mrr} currency={currency} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground text-right whitespace-nowrap tabular-nums">
                      <MoneyValue value={snapshot.arr} currency={currency} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-sm text-success text-right whitespace-nowrap tabular-nums">
                      +<MoneyValue value={snapshot.new_mrr} currency={currency} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-sm text-success text-right whitespace-nowrap tabular-nums">
                      +<MoneyValue value={snapshot.expansion_mrr} currency={currency} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-sm text-destructive text-right whitespace-nowrap tabular-nums">
                      -<MoneyValue value={snapshot.churned_mrr} currency={currency} size="sm" />
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {getSourceLabel(snapshot.source)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
