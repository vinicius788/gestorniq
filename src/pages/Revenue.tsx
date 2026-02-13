import { useState, useRef } from "react";
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

export default function Revenue() {
  const { company } = useCompany();
  const { metrics, revenueSnapshots, addRevenueSnapshot, loading } = useMetrics();
  const { isDemoMode } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mrr: '',
    new_mrr: '',
    expansion_mrr: '',
    churned_mrr: '',
  });

  const currency = (company?.currency || 'USD') as Currency;

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
      await addRevenueSnapshot({
        date: formData.date,
        mrr: parseFloat(formData.mrr),
        new_mrr: parseFloat(formData.new_mrr) || 0,
        expansion_mrr: parseFloat(formData.expansion_mrr) || 0,
        churned_mrr: parseFloat(formData.churned_mrr) || 0,
        source: 'manual',
      });
      toast.success('Revenue data saved!');
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mrr: '',
        new_mrr: '',
        expansion_mrr: '',
        churned_mrr: '',
      });
    } catch (error) {
      toast.error('Error saving data');
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
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const parsed = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            const row: any = {};
            headers.forEach((header, i) => {
              row[header] = values[i]?.trim();
            });
            return row;
          });
        
        setCsvData(parsed);
        setShowCsvImport(true);
        toast.success(`${parsed.length} rows imported`);
      } catch (error) {
        toast.error('Error processing CSV');
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
      for (const row of csvData) {
        await addRevenueSnapshot({
          date: row.date || row.data || new Date().toISOString().split('T')[0],
          mrr: parseFloat(row.mrr) || 0,
          new_mrr: parseFloat(row.new_mrr || row.novo_mrr) || 0,
          expansion_mrr: parseFloat(row.expansion_mrr || row.expansao_mrr) || 0,
          churned_mrr: parseFloat(row.churned_mrr || row.churn_mrr) || 0,
          source: 'csv',
        });
      }
      toast.success('Data imported successfully!');
      setShowCsvImport(false);
      setCsvData([]);
    } catch (error) {
      toast.error('Error importing data');
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
          <p className="text-sm text-muted-foreground mb-4">{csvData.length} records to import</p>
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
        <h3 className="text-lg font-semibold text-foreground mb-4">Revenue History</h3>
        {revenueSnapshots.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No revenue data. Click "Add Revenue" to get started.
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
                {revenueSnapshots.slice(0, 10).map((snapshot) => (
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
                    <td className="py-3 px-2 text-sm text-muted-foreground capitalize">
                      {snapshot.source === 'demo' ? 'Demo' : snapshot.source === 'csv' ? 'CSV' : 'Manual'}
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
