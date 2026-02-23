import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, AlertCircle, Plus, Upload, Users, UserPlus, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ChartCardSkeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { UserGrowthMetrics } from "@/components/dashboard/UserGrowthMetrics";
import { FormattedNumber, FormattedPercent } from "@/components/ui/formatted-value";
import { useMetrics } from "@/hooks/useMetrics";
import { useApp } from "@/contexts/AppContext";
import { formatDate, getGrowthLabel } from "@/lib/format";
import { parseCsv } from "@/lib/csv";
import { calculateUserCadenceMetrics } from "@/lib/calculations";
import { normalizeUserMetricInput, type UserMetricInput } from "@/lib/metric-input";

const TODAY = () => new Date().toISOString().split("T")[0];

const periodConfig = {
  daily: { label: "Daily", unit: "users/day" },
  weekly: { label: "Weekly", unit: "users/week" },
  monthly: { label: "Monthly", unit: "users/30 days" },
} as const;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function UserGrowth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const { metrics, userMetrics, filteredUserMetrics, addUserMetrics, addUserMetricsBatch, loading, error } = useMetrics();
  const { isDemoMode } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csvData, setCsvData] = useState<UserMetricInput[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: TODAY(),
    total_users: "",
    new_users: "",
    active_users: "",
    churned_users: "",
  });

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
    if (!formData.total_users) {
      toast.error("Total users is required");
      return;
    }

    if (isDemoMode) {
      toast.error("Cannot add data in demo mode");
      return;
    }

    setSubmitting(true);
    try {
      const normalized = normalizeUserMetricInput({
        date: formData.date,
        total_users: formData.total_users,
        new_users: formData.new_users,
        active_users: formData.active_users,
        churned_users: formData.churned_users,
        source: "manual",
      });

      await addUserMetrics(normalized);
      toast.success("User metrics saved");
      setShowForm(false);
      setFormData({
        date: TODAY(),
        total_users: "",
        new_users: "",
        active_users: "",
        churned_users: "",
      });
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, "Error saving data"));
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
        const parsed: UserMetricInput[] = [];
        const validationErrors: string[] = [];

        rows.forEach((row, index) => {
          try {
            const normalized = normalizeUserMetricInput({
              date: row.date || row.data || TODAY(),
              total_users: row.total_users || row.total || 0,
              new_users: row.new_users || row.novos || 0,
              active_users: row.active_users || row.ativos || 0,
              churned_users: row.churned_users || row.churn || 0,
              source: "csv",
            });

            parsed.push(normalized);
          } catch (rowError) {
            validationErrors.push(`Row ${index + 2}: ${getErrorMessage(rowError, "Invalid data")}`);
          }
        });

        if (parsed.length === 0) {
          toast.error("No valid rows found in CSV");
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
        toast.error(getErrorMessage(csvError, "Error processing CSV"));
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (isDemoMode) {
      toast.error("Cannot import data in demo mode");
      return;
    }

    setSubmitting(true);
    try {
      await addUserMetricsBatch(csvData);

      toast.success("Data imported successfully");
      setShowCsvImport(false);
      setCsvData([]);
      setCsvErrors([]);
    } catch (importError) {
      toast.error(getErrorMessage(importError, "Error importing data"));
    } finally {
      setSubmitting(false);
    }
  };

  const growthLabel = getGrowthLabel(metrics.userGrowth);
  const cadenceMetrics = calculateUserCadenceMetrics(filteredUserMetrics);
  const selectedCadence = cadenceMetrics[selectedPeriod];
  const selectedCadenceValue = selectedCadence.value !== null
    ? Math.round(selectedCadence.value)
    : null;
  const selectedCadencePreciseValue = selectedCadence.value !== null
    ? selectedCadence.value.toFixed(1)
    : "—";
  const selectedPeriodLabel = periodConfig[selectedPeriod].label;
  const selectedPeriodUnit = periodConfig[selectedPeriod].unit;

  if (loading) {
    return (
      <div className="page-section animate-fade-in">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="page-section animate-fade-in">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load user metrics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!metrics.hasUserData && !isDemoMode && (
        <EmptyState
          icon={Users}
          title="No user data yet"
          description="Start with your first user snapshot to unlock growth analytics and trend tracking."
          actionLabel="Add user metrics"
          onAction={() => setShowForm(true)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {isDemoMode ? "Demo data mode is enabled." : "Use manual entries or CSV to keep user metrics up to date."}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isDemoMode}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowForm((prev) => !prev)} disabled={isDemoMode}>
            <Plus className="mr-2 h-4 w-4" />
            Add Metrics
          </Button>
        </div>
      </div>

      {showCsvImport && (
        <div className="metric-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Import Preview</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCsvImport(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{csvData.length} valid records ready to import.</p>
          {csvErrors.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning-foreground">
              <p className="font-medium">{csvErrors.length} rows skipped due to validation errors.</p>
              <p className="mt-1 text-xs text-muted-foreground">{csvErrors.slice(0, 3).join(" • ")}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleImportCsv} disabled={submitting}>
              {submitting ? "Importing..." : "Confirm Import"}
            </Button>
            <Button variant="outline" onClick={() => setShowCsvImport(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="metric-card">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Add User Metrics</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <div className="flex gap-2 xl:col-span-5">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <SegmentedControl
        value={selectedPeriod}
        onChange={setSelectedPeriod}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={<FormattedNumber value={metrics.totalUsers} />}
          delta={metrics.hasUserData ? metrics.userGrowth : null}
          deltaLabel="month over month"
          icon={Users}
          empty={!metrics.hasUserData}
          emptyText="Add user snapshots"
        />
        <StatCard
          label={`New Users (${selectedPeriodLabel})`}
          value={<FormattedNumber value={selectedCadenceValue} />}
          delta={metrics.hasUserData ? selectedCadence.change : null}
          deltaLabel={`vs previous ${selectedPeriod.toLowerCase()} cadence`}
          icon={UserPlus}
          empty={!metrics.hasUserData}
          emptyText={`Needs ${selectedPeriod.toLowerCase()} snapshots`}
        />
        <StatCard
          label="Growth Rate"
          value={<FormattedPercent value={metrics.userGrowth} className="text-2xl font-bold" />}
          delta={metrics.hasUserData ? metrics.userGrowth : null}
          deltaLabel="month over month"
          icon={TrendingUp}
          empty={!metrics.hasUserData}
          emptyText="Needs monthly user data"
        />
        <StatCard
          label="User Cadence"
          value={selectedCadencePreciseValue}
          delta={metrics.hasUserData ? selectedCadence.change : null}
          deltaLabel={`${selectedPeriodUnit} • ${growthLabel.symbol} ${growthLabel.label}`}
          icon={Activity}
          empty={!metrics.hasUserData}
          emptyText="Needs recurring snapshots"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <UserGrowthChart />
        <UserGrowthMetrics />
      </div>

      <div className="metric-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Metrics History</h3>
        {userMetrics.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No history yet"
            description="Once you add user snapshots, this table will show the latest entries."
            actionLabel="Add metrics"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">New</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Churned</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {userMetrics.slice(0, 10).map((metric) => (
                  <tr key={metric.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-3 text-sm text-foreground">{formatDate(metric.date)}</td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-foreground">
                      <FormattedNumber value={metric.total_users} />
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-success">
                      +<FormattedNumber value={metric.new_users} />
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-foreground">
                      <FormattedNumber value={metric.active_users} />
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-destructive">
                      -<FormattedNumber value={metric.churned_users} />
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground capitalize">
                      {metric.source === "demo" ? "Demo" : metric.source === "csv" ? "CSV" : "Manual"}
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
