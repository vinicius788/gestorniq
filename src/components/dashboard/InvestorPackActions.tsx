import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildInvestorPackCsv,
  buildInvestorPackHtml,
  downloadCsvFile,
  openInvestorPackPrintWindow,
} from "@/lib/investor-pack";
import type { Currency } from "@/lib/format";
import type { CalculatedMetrics, RevenueSnapshot, UserMetric, ValuationSnapshot } from "@/lib/calculations";

interface InvestorPackActionsProps {
  compact?: boolean;
  companyName: string;
  currency: Currency;
  metrics: CalculatedMetrics;
  revenueSnapshots: RevenueSnapshot[];
  userMetrics: UserMetric[];
  valuationSnapshots: ValuationSnapshot[];
}

export function InvestorPackActions({
  compact = false,
  companyName,
  currency,
  metrics,
  revenueSnapshots,
  userMetrics,
  valuationSnapshots,
}: InvestorPackActionsProps) {
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const hasData = metrics.hasData || revenueSnapshots.length > 0 || userMetrics.length > 0 || valuationSnapshots.length > 0;
  const today = new Date().toISOString().split("T")[0];

  const payload = useMemo(
    () => ({
      companyName: companyName || "My SaaS Company",
      currency,
      generatedAt: new Date(),
      metrics,
      revenueSnapshots,
      userMetrics,
      valuationSnapshots,
    }),
    [companyName, currency, metrics, revenueSnapshots, userMetrics, valuationSnapshots],
  );

  const handleExportCsv = () => {
    if (!hasData) {
      toast.error("Add at least one snapshot before exporting.");
      return;
    }

    setCsvLoading(true);
    try {
      const csv = buildInvestorPackCsv(payload);
      downloadCsvFile(`gestorniq-investor-pack-${today}.csv`, csv);
      toast.success("Investor Pack CSV exported.");
    } catch {
      toast.error("Failed to export CSV.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!hasData) {
      toast.error("Add at least one snapshot before exporting.");
      return;
    }

    setPdfLoading(true);
    try {
      const html = buildInvestorPackHtml(payload);
      openInvestorPackPrintWindow("GestorNiq Investor Pack", html);
      toast.success("Print window opened. Choose 'Save as PDF'.");
    } catch {
      toast.error("Failed to open PDF export.");
    } finally {
      setPdfLoading(false);
    }
  };

  const size = compact ? "sm" : "default";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size={size} onClick={handleExportCsv} disabled={csvLoading || !hasData}>
        {csvLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        Export CSV
      </Button>
      <Button variant="outline" size={size} onClick={handleExportPdf} disabled={pdfLoading || !hasData}>
        {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
        Export PDF
      </Button>
    </div>
  );
}
