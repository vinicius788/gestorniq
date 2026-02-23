import { Bell, Menu, LogOut, Settings, User, Upload, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeframeSelector } from "@/components/dashboard/TimeframeSelector";
import { DemoModeToggle } from "@/components/dashboard/DemoModeToggle";
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

const PAGE_META: Array<{ matcher: (path: string) => boolean; title: string }> = [
  {
    matcher: (path) => path === "/dashboard",
    title: "Dashboard",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/revenue"),
    title: "Revenue",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/user-growth"),
    title: "User Growth",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/valuation"),
    title: "Valuation",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/equity"),
    title: "Equity Calculator",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/settings"),
    title: "Settings",
  },
  {
    matcher: (path) => path.startsWith("/dashboard/billing"),
    title: "Billing",
  },
];

function getPageMeta(pathname: string) {
  return PAGE_META.find((item) => item.matcher(pathname)) ?? PAGE_META[0];
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { company } = useCompany();
  const { isDemoMode } = useApp();
  const { t } = useLanguage();

  const pageMeta = getPageMeta(location.pathname);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const dataSourceStatus = isDemoMode
    ? { label: "Demo", variant: "secondary" as const }
    : company?.data_source
      ? { label: "Connected", variant: "default" as const }
      : { label: "Not connected", variant: "outline" as const };

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
      <div className="app-shell-container flex min-h-[84px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{pageMeta.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden xl:block">
            <TimeframeSelector />
          </div>

          <Badge variant={dataSourceStatus.variant} className="hidden sm:inline-flex">
            {dataSourceStatus.label}
          </Badge>

          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="mr-1 h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={handleAddMetric}>
              <Plus className="mr-1 h-4 w-4" />
              Add Metrics
            </Button>
          </div>

          <DemoModeToggle />

          <Button variant="ghost" size="icon" className="relative shrink-0">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline">{displayName}</span>
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
      <div className="border-t border-border/70 px-4 py-2 sm:hidden">
        <TimeframeSelector />
      </div>
    </header>
  );
}
