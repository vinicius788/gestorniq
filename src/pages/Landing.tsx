import { Link, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  Check,
  LineChart as LineChartIcon,
  Calculator,
  FileText,
  Star,
  Layers,
  Target,
  Sparkles,
  PieChart
} from "lucide-react";
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ProductExperiencePreview } from "@/components/landing/ProductExperiencePreview";
import {
  UI_PREVIEW_AUTH_STORAGE_KEY,
  UI_PREVIEW_COMPANY_STORAGE_KEY,
  UI_PREVIEW_DEFAULTS,
} from "@/lib/auth-config";

export default function Landing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const enablePreviewAccess = () => {
    const nowIso = new Date().toISOString();

    localStorage.setItem(UI_PREVIEW_AUTH_STORAGE_KEY, 'true');
    localStorage.setItem('gestorniq-demo-mode', 'true');
    localStorage.setItem('gestorniq-onboarding-complete', 'true');
    localStorage.setItem(
      UI_PREVIEW_COMPANY_STORAGE_KEY,
      JSON.stringify({
        id: UI_PREVIEW_DEFAULTS.companyId,
        user_id: UI_PREVIEW_DEFAULTS.userId,
        clerk_user_id: UI_PREVIEW_DEFAULTS.userId,
        name: UI_PREVIEW_DEFAULTS.companyName,
        currency: 'USD',
        created_at: nowIso,
        updated_at: nowIso,
        onboarding_completed: true,
        onboarding_completed_at: nowIso,
        data_source: 'demo',
      }),
    );
  };

  const openDashboardInstantly = () => {
    enablePreviewAccess();
    navigate('/dashboard?demo=1', { replace: true });
  };

  const handleViewDemo = () => {
    openDashboardInstantly();
  };

  const features = [
    {
      icon: BarChart3,
      title: t.landing.features.mrr.title,
      description: t.landing.features.mrr.description,
    },
    {
      icon: TrendingUp,
      title: t.landing.features.forecast.title,
      description: t.landing.features.forecast.description,
    },
    {
      icon: Calculator,
      title: t.landing.features.valuation.title,
      description: t.landing.features.valuation.description,
    },
    {
      icon: FileText,
      title: t.landing.features.reports.title,
      description: t.landing.features.reports.description,
    },
    {
      icon: PieChart,
      title: "Equity & Share Price Calculator",
      description:
        "Enter any equity percentage and instantly see the implied value of that stake based on your live valuation. Perfect for investor conversations and term sheet prep.",
      badge: "Included in all plans",
    },
  ];

  const howItWorks = [
    { step: 1, icon: Layers, ...t.landing.howItWorks.step1 },
    { step: 2, icon: LineChartIcon, ...t.landing.howItWorks.step2 },
    { step: 3, icon: Target, ...t.landing.howItWorks.step3 },
  ];

  const testimonials = [
    {
      initials: "LM",
      nameAndRole: "Lucas M. · Co-founder @ Fintech Startup",
      quote:
        "I closed my first VC meeting using the dashboard exported directly from GestorNiq. It finally made our story easy to explain.",
      accentClassName: "bg-chart-2/20 text-chart-2",
    },
    {
      initials: "AR",
      nameAndRole: "Ana R. · Founder @ B2B SaaS",
      quote:
        "The MRR breakdown and valuation context helped us prepare for term sheet conversations with much more confidence.",
      accentClassName: "bg-primary/20 text-primary",
    },
    {
      initials: "DT",
      nameAndRole: "Diego T. · CEO @ AI Startup",
      quote:
        "In less than one hour we moved from spreadsheets to one investor-ready dashboard with metrics, forecast, and equity context.",
      accentClassName: "bg-success/20 text-success",
    },
  ];

  const conversionSignals = [
    { value: '10 min', label: 'to set up and see first insights' },
    { value: '3 days', label: 'of trial to validate value before paying' },
    { value: '1 dashboard', label: 'with a story ready for board and investors' },
  ];

  const launchMessage = "Launch offer: start in guided mode and get your investor dashboard live today.";
  const heroMrrTrend = [
    { month: "Jan", mrr: 28200 },
    { month: "Feb", mrr: 31800 },
    { month: "Mar", mrr: 34700 },
    { month: "Apr", mrr: 37900 },
    { month: "May", mrr: 41200 },
    { month: "Jun", mrr: 45200 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <BrandLogo size="sm" theme="dark" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.features}</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.pricing}</a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.security}</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={openDashboardInstantly}>
              Open dashboard
            </Button>
            <Button variant="hero" onClick={openDashboardInstantly}>
              {t.landing.cta.primary}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t.landing.badge}</span>
            </div>

            <div className="mb-5 rounded-full border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground inline-flex items-center">
              {launchMessage}
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
              {t.landing.headline}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              {t.landing.subheadline}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" onClick={openDashboardInstantly}>
                <>
                  {t.landing.cta.primary}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              </Button>
              <Button variant="hero-outline" size="xl" onClick={handleViewDemo}>
                {t.landing.cta.secondary}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              {t.landing.cta.disclaimer}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
              {conversionSignals.map((signal) => (
                <div key={signal.label} className="rounded-xl border border-border bg-card/50 px-4 py-3 text-left">
                  <p className="text-lg font-bold text-foreground">{signal.value}</p>
                  <p className="text-xs text-muted-foreground">{signal.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-card p-2 max-w-5xl mx-auto">
              <div className="rounded-lg bg-card border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <span className="ml-2 text-xs text-muted-foreground">{t.landing.preview.dashboard}</span>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "MRR", value: "$45,200", change: "+12.5%" },
                      { label: "ARR", value: "$542K", change: "+12.5%" },
                      { label: "Net New MRR", value: "$4,800", change: "+8.2%" },
                      { label: "Valuation", value: "$5.4M", change: "12x ARR" },
                    ].map((metric) => (
                      <div key={metric.label} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className="text-xl font-bold text-foreground mt-1 whitespace-nowrap tabular-nums">{metric.value}</p>
                        <p className="text-xs text-success mt-1 tabular-nums">{metric.change}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-foreground">MRR Trend</p>
                      <p className="text-xs text-muted-foreground">Monthly recurring revenue momentum (demo data)</p>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={heroMrrTrend} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            width={58}
                            tickFormatter={(value: number) =>
                              value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`
                            }
                          />
                          <Tooltip
                            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "12px",
                              color: "hsl(var(--popover-foreground))",
                              fontSize: "12px",
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString("en-US")}`, "MRR"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="mrr"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                            activeDot={{ r: 5 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.howItWorks.title}
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.testimonials.title}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((testimonial) => (
              <div key={testimonial.nameAndRole} className="metric-card border border-border/70 bg-card/70">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${testimonial.accentClassName}`}>
                    {testimonial.initials}
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    {[...Array(5)].map((_, index) => (
                      <Star key={`${testimonial.initials}-star-${index}`} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  {testimonial.nameAndRole}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm font-medium text-primary">
            Trusted by 40+ early-stage founders
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.features.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t.landing.features.subtitle}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="metric-card group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                {"badge" in feature ? (
                  <span className="mt-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {feature.badge}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.preview.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Switch between dashboard surfaces and interact with the same controls users will use inside the app.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <ProductExperiencePreview />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t.pricing.subtitle}
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="metric-card relative border-primary ring-1 ring-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {t.pricing.standard.badge}
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{t.pricing.standard.name}</h3>
                <p className="text-sm text-muted-foreground">{t.pricing.standard.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{t.pricing.standard.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
                <p className="text-sm text-muted-foreground mt-2">{t.pricing.billedAnnually}: {t.pricing.standard.annualPrice}</p>
              </div>
              <ul className="space-y-3 mb-6">
                {t.pricing.standard.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="w-full" onClick={openDashboardInstantly}>
                {t.pricing.standard.cta}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.security.title}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t.landing.security.description}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {t.landing.security.badges.map((badge) => (
                <span key={badge} className="px-4 py-2 rounded-full bg-muted border border-border text-sm text-muted-foreground">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="metric-card max-w-3xl mx-auto text-center py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {t.landing.cta2.title}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t.landing.cta2.subtitle}
              </p>
              <Button variant="hero" size="xl" onClick={openDashboardInstantly}>
                <>
                  {t.landing.cta2.button}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <BrandLogo size="sm" theme="dark" />
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link
                to="/support"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {currentYear} GestorNiq. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
