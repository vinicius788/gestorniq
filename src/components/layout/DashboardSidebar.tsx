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

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useLanguage();

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
        "fixed left-0 top-0 z-40 h-screen w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
          <BrandLogo size="sm" showTagline className="min-w-0" theme="dark" />
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
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

        <div className="border-t border-sidebar-border p-4">
          <button 
            onClick={handleLogout}
            className="sidebar-link w-full text-left"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
