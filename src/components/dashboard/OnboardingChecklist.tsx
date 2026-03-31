import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Circle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCompany } from "@/hooks/useCompany";

interface ChecklistState {
  visitedValuation: boolean;
  exportedInvestorPack: boolean;
  dismissed: boolean;
}

const DEFAULT_STATE: ChecklistState = {
  visitedValuation: false,
  exportedInvestorPack: false,
  dismissed: false,
};

function readChecklistState(storageKey: string | null): ChecklistState {
  if (!storageKey) return DEFAULT_STATE;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw) as Partial<ChecklistState> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_STATE;

    return {
      visitedValuation: Boolean(parsed.visitedValuation),
      exportedInvestorPack: Boolean(parsed.exportedInvestorPack),
      dismissed: Boolean(parsed.dismissed),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function OnboardingChecklist() {
  const { user } = useAuth();
  const { company } = useCompany();
  const location = useLocation();

  const [hasRevenueData, setHasRevenueData] = useState(false);
  const [state, setState] = useState<ChecklistState>(DEFAULT_STATE);

  const storageKey = user?.id ? `gestorniq_onboarding_${user.id}` : null;

  const persistState = useCallback(
    (updater: ChecklistState | ((prev: ChecklistState) => ChecklistState)) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    setState(readChecklistState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    const loadRevenueStatus = async () => {
      if (!company?.id) {
        setHasRevenueData(false);
        return;
      }

      const { data, error } = await supabase
        .from("revenue_snapshots")
        .select("id")
        .eq("company_id", company.id)
        .limit(1);

      if (cancelled) return;
      if (error) {
        setHasRevenueData(false);
        return;
      }

      setHasRevenueData((data?.length ?? 0) > 0);
    };

    void loadRevenueStatus();

    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  useEffect(() => {
    if (!location.pathname.startsWith("/dashboard/valuation")) return;

    persistState((prev) =>
      prev.visitedValuation
        ? prev
        : {
            ...prev,
            visitedValuation: true,
          },
    );
  }, [location.pathname, persistState]);

  useEffect(() => {
    const onInvestorPackExported = () => {
      persistState((prev) =>
        prev.exportedInvestorPack
          ? prev
          : {
              ...prev,
              exportedInvestorPack: true,
            },
      );
    };

    window.addEventListener("gestorniq:investor-pack-exported", onInvestorPackExported);
    return () => window.removeEventListener("gestorniq:investor-pack-exported", onInvestorPackExported);
  }, [persistState]);

  const checklistItems = useMemo(
    () => [
      {
        id: "workspace",
        label: "Create your workspace",
        completed: Boolean(company?.id),
      },
      {
        id: "revenue",
        label: "Add your first revenue data",
        completed: hasRevenueData,
      },
      {
        id: "valuation",
        label: "View your valuation",
        completed: state.visitedValuation,
      },
      {
        id: "export",
        label: "Export Investor Pack",
        completed: state.exportedInvestorPack,
      },
    ],
    [company?.id, hasRevenueData, state.exportedInvestorPack, state.visitedValuation],
  );

  if (!user || state.dismissed) {
    return null;
  }

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const progressValue = (completedCount / totalCount) * 100;
  const isCompleted = completedCount === totalCount;

  return (
    <section className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">Getting started</p>
        <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} completed</p>
      </div>

      <Progress value={progressValue} className="h-1 bg-muted/50" />

      <ul className="mt-3 space-y-1.5">
        {checklistItems.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-[13px]">
            {item.completed ? (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Check className="h-3 w-3" />
              </span>
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={item.completed ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </li>
        ))}
      </ul>

      {isCompleted ? (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <p className="text-sm font-medium text-foreground">🎉 You&apos;re investor-ready!</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 w-full"
            onClick={() =>
              persistState((prev) => ({
                ...prev,
                dismissed: true,
              }))
            }
          >
            Dismiss
          </Button>
        </div>
      ) : null}
    </section>
  );
}
