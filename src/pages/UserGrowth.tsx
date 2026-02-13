import { useState, useRef } from "react";
import { Users, UserPlus, TrendingUp, Activity, Upload, Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { UserGrowthMetrics } from "@/components/dashboard/UserGrowthMetrics";
import { FormattedNumber, FormattedPercent } from "@/components/ui/formatted-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { formatDate, getGrowthLabel } from "@/lib/format";

export default function UserGrowth() {
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const { metrics, userMetrics, addUserMetrics, loading } = useMetrics();
  const { isDemoMode } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    total_users: '',
    new_users: '',
    active_users: '',
    churned_users: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.total_users) {
      toast.error('Total users is required');
      return;
    }

    if (isDemoMode) {
      toast.error('Cannot add data in demo mode');
      return;
    }

    setSubmitting(true);
    try {
      await addUserMetrics({
        date: formData.date,
        total_users: parseInt(formData.total_users),
        new_users: parseInt(formData.new_users) || 0,
        active_users: parseInt(formData.active_users) || 0,
        churned_users: parseInt(formData.churned_users) || 0,
        source: 'manual',
      });
      toast.success('User metrics saved!');
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        total_users: '',
        new_users: '',
        active_users: '',
        churned_users: '',
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
        await addUserMetrics({
          date: row.date || row.data || new Date().toISOString().split('T')[0],
          total_users: parseInt(row.total_users || row.total) || 0,
          new_users: parseInt(row.new_users || row.novos) || 0,
          active_users: parseInt(row.active_users || row.ativos) || 0,
          churned_users: parseInt(row.churned_users || row.churn) || 0,
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

  const growthLabel = getGrowthLabel(metrics.userGrowth);

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
          <h1 className="text-2xl font-bold text-foreground">User Growth</h1>
          <p className="text-muted-foreground">
            Track user acquisition and growth
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
            Add Metrics
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

      {/* Form */}
      {showForm && (
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Add User Metrics</h3>
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
              <label className="text-sm font-medium text-muted-foreground">Total Users *</label>
              <Input
                type="number"
                placeholder="3650"
                value={formData.total_users}
                onChange={(e) => setFormData({ ...formData, total_users: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">New Users</label>
              <Input
                type="number"
                placeholder="370"
                value={formData.new_users}
                onChange={(e) => setFormData({ ...formData, new_users: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Active Users</label>
              <Input
                type="number"
                placeholder="1247"
                value={formData.active_users}
                onChange={(e) => setFormData({ ...formData, active_users: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Churned Users</label>
              <Input
                type="number"
                placeholder="50"
                value={formData.churned_users}
                onChange={(e) => setFormData({ ...formData, churned_users: e.target.value })}
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

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedPeriod === period
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      {/* Main Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-chart-2/70" />
            <span className="text-sm text-muted-foreground">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.totalUsers} />
          </p>
          {metrics.hasUserData && metrics.userGrowth !== null ? (
            <p className="text-sm mt-1 tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign colorize /> MoM
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-chart-2/70" />
            <span className="text-sm text-muted-foreground">New Users (30d)</span>
          </div>
          <p className="text-3xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedNumber value={metrics.newUsers} />
          </p>
          {metrics.hasUserData && metrics.userGrowth !== null ? (
            <p className="text-sm text-success mt-1 tabular-nums">
              <FormattedPercent value={metrics.userGrowth} showSign /> vs previous
            </p>
          ) : (
            <p className="text-sm mt-1 text-muted-foreground">—</p>
          )}
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-chart-2/70" />
            <span className="text-sm text-muted-foreground">Growth Rate</span>
          </div>
          <p className="text-3xl font-bold text-foreground whitespace-nowrap tabular-nums">
            <FormattedPercent value={metrics.userGrowth} />
          </p>
          <p className="text-sm text-muted-foreground mt-1">Month over month</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-chart-2/70" />
            <span className="text-sm text-muted-foreground">Daily Signups (avg)</span>
          </div>
          <p className="text-3xl font-bold text-foreground whitespace-nowrap tabular-nums">
            {metrics.avgDailySignups !== null ? metrics.avgDailySignups.toFixed(1) : '—'}
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            {growthLabel.emoji} {growthLabel.label}
          </p>
        </div>
      </div>

      {/* Charts */}
      {metrics.hasUserData && (
        <div className="grid gap-6 lg:grid-cols-2">
          <UserGrowthChart />
          <UserGrowthMetrics />
        </div>
      )}

      {/* History */}
      {userMetrics.length > 0 && (
        <div className="metric-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Metrics History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">New</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Active</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Churned</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {userMetrics.slice(0, 10).map((metric) => (
                  <tr key={metric.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-2 text-sm text-foreground whitespace-nowrap">
                      {formatDate(metric.date)}
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground text-right font-medium whitespace-nowrap tabular-nums">
                      <FormattedNumber value={metric.total_users} />
                    </td>
                    <td className="py-3 px-2 text-sm text-success text-right whitespace-nowrap tabular-nums">
                      +<FormattedNumber value={metric.new_users} />
                    </td>
                    <td className="py-3 px-2 text-sm text-foreground text-right whitespace-nowrap tabular-nums">
                      <FormattedNumber value={metric.active_users} />
                    </td>
                    <td className="py-3 px-2 text-sm text-destructive text-right whitespace-nowrap tabular-nums">
                      -<FormattedNumber value={metric.churned_users} />
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground capitalize">
                      {metric.source === 'demo' ? 'Demo' : metric.source === 'csv' ? 'CSV' : 'Manual'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
