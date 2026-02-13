import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  DollarSign, 
  TrendingUp, 
  Calculator, 
  Settings,
  LogOut,
  Zap,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const location = useLocation();
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
        "fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground truncate">GestorNiq</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
            
            return (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={onClose}
                className={cn(
                  "sidebar-link",
                  isActive && "active"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
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
