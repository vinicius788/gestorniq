import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  DollarSign, 
  TrendingUp, 
  Calculator, 
  Settings,
  LogOut,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { SidebarItem } from "@/components/layout/SidebarItem";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { MoneyValue } from "@/components/ui/money-value";
import { useCompany } from "@/hooks/useCompany";
import { useMetrics } from "@/hooks/useMetrics";
import type { Currency } from "@/lib/format";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { company } = useCompany();
  const { metrics } = useMetrics();

  const currency = (company?.currency || "USD") as Currency;

  const navItems = [
    { title: t.nav.dashboard, url: "/dashboard", icon: LayoutDashboard },
    { title: t.nav.revenue, url: "/dashboard/revenue", icon: DollarSign },
    { title: t.nav.userGrowth, url: "/dashboard/user-growth", icon: Users },
    { title: t.nav.valuation, url: "/dashboard/valuation", icon: TrendingUp },
    { title: t.nav.equity, url: "/dashboard/equity", icon: Calculator },
    { title: t.nav.settings, url: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-[260px] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
        "lg:static lg:z-auto lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <BrandLogo size="sm" showTagline className="min-w-0" theme="dark" />
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-shrink-0 space-y-1 px-4 pb-2 pt-4">
          {navItems.map((item) => (
            <SidebarItem
              key={item.title}
              to={item.url}
              label={item.title}
              icon={item.icon}
              onClick={onClose}
              end={item.url === "/dashboard"}
            />
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          <OnboardingChecklist />
        </div>

        <div className="mt-auto flex-shrink-0 border-t border-white/10 px-4 pb-4 pt-2">
          <div className="mx-0 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Current MRR</p>
            <div className="flex items-center justify-between gap-2">
              <MoneyValue value={metrics.mrr} currency={currency} size="xl" className="text-white" />
              {metrics.mrrGrowth === null || metrics.mrrGrowth === undefined ? (
                <span className="text-xs font-semibold tabular-nums text-white/40">—</span>
              ) : (
                <span className={`text-xs font-semibold tabular-nums ${metrics.mrrGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.mrrGrowth >= 0 ? "↑" : "↓"} {Math.abs(metrics.mrrGrowth).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="sidebar-link mt-3 w-full text-left"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
