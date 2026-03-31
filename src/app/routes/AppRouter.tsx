import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "@/lib/icons";

const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Revenue = lazy(() => import("@/pages/Revenue"));
const Valuation = lazy(() => import("@/pages/Valuation"));
const EquityCalculator = lazy(() => import("@/pages/EquityCalculator"));
const Settings = lazy(() => import("@/pages/Settings"));
const UserGrowth = lazy(() => import("@/pages/UserGrowth"));
const Billing = lazy(() => import("@/pages/Billing"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Support = lazy(() => import("@/pages/Support"));
const BrandPreview = lazy(() => import("@/pages/BrandPreview"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const DashboardLayout = lazy(() =>
  import("@/components/layout/DashboardLayout").then((mod) => ({
    default: mod.DashboardLayout,
  }))
);

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/brand-preview" element={<BrandPreview />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="user-growth" element={<UserGrowth />} />
            <Route path="valuation" element={<Valuation />} />
            <Route path="equity" element={<EquityCalculator />} />
            <Route path="settings" element={<Settings />} />
            <Route path="billing" element={<Billing />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
