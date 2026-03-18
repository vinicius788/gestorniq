import { Bell, LogOut, Menu, Plus, Settings, Upload, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TimeframeSelector } from "@/components/dashboard/TimeframeSelector";
import { DemoModeToggle } from "@/components/dashboard/DemoModeToggle";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { company } = useCompany();
  const { isDemoMode } = useApp();
  const { t } = useLanguage();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const isConnected = Boolean(company?.data_source);
  const dataSourceLabel = isConnected ? "Connected" : "Not connected";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleImport = () => {
    if (location.pathname.startsWith("/dashboard/user-growth")) {
      navigate("/dashboard/user-growth?action=import");
      return;
    }

    navigate("/dashboard/revenue?action=import");
  };

  const handleAddMetric = () => {
    if (location.pathname.startsWith("/dashboard/revenue")) {
      navigate("/dashboard/revenue?action=add");
      return;
    }

    navigate("/dashboard/user-growth?action=add");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="app-shell-container flex min-h-[84px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
            <TimeframeSelector />
            <div className="h-5 w-px shrink-0 bg-white/10" />
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                isConnected
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "border-white/20 bg-white/5 text-white/60",
              ].join(" ")}
            >
              <span className={isConnected ? "h-1 w-1 rounded-full bg-blue-400" : "h-1 w-1 rounded-full bg-white/40"} />
              {dataSourceLabel}
            </span>
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
            <Button variant="outline" size="sm" onClick={handleImport} className="gap-1 px-3">
              <Upload className="h-4 w-4" />
              <span className="hidden xl:inline">Import CSV</span>
            </Button>

            <Button size="sm" onClick={handleAddMetric} className="gap-1 px-3">
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">Add Metrics</span>
            </Button>
          </div>

          <div className="hidden h-5 w-px shrink-0 bg-white/10 lg:block" />

          <div className="flex shrink-0 items-center gap-2">
            <TrialBanner className="hidden lg:inline-flex" />

            {isDemoMode ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                <span aria-hidden="true">⚡</span>
                <span className="hidden xl:inline">Demo</span>
              </span>
            ) : null}

            <DemoModeToggle labelClassName="hidden xl:inline" />

            <div className="hidden h-5 w-px shrink-0 bg-white/10 sm:block" />

            <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium 2xl:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 w-56 border-border bg-popover">
                <DropdownMenuLabel>{user?.email || "User"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t.nav.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 px-4 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <TimeframeSelector />
          <div className="h-5 w-px shrink-0 bg-white/10" />
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
              isConnected
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-white/20 bg-white/5 text-white/60",
            ].join(" ")}
          >
            <span className={isConnected ? "h-1 w-1 rounded-full bg-blue-400" : "h-1 w-1 rounded-full bg-white/40"} />
            {dataSourceLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
