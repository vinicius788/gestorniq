import { Link, useNavigate } from "react-router-dom";
import { 
  Zap, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  Check,
  LineChart,
  Calculator,
  FileText,
  Star,
  Layers,
  Target,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Landing() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleViewDemo = () => {
    // Persist intent so authenticated and non-authenticated flows behave consistently.
    localStorage.setItem('gestorniq-demo-mode', 'true');
    localStorage.setItem('gestorniq-onboarding-complete', 'true');
    navigate('/auth?demo=1');
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
  ];

  const howItWorks = [
    { step: 1, icon: Layers, ...t.landing.howItWorks.step1 },
    { step: 2, icon: LineChart, ...t.landing.howItWorks.step2 },
    { step: 3, icon: Target, ...t.landing.howItWorks.step3 },
  ];

  const testimonials = [
    {
      quote: "Finally a simple way to track our SaaS metrics without spreadsheets. The investor reports alone saved us hours.",
      author: "Sarah Chen",
      role: "CEO, TechFlow",
    },
    {
      quote: "The valuation calculator helped us negotiate our Series A with real data. Highly recommend.",
      author: "Marcus Johnson",
      role: "Founder, DataSync",
    },
    {
      quote: "Clean interface, connects to Stripe in seconds. Exactly what every SaaS founder needs.",
      author: "Emma Williams",
      role: "CTO, CloudBase",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">GestorNiq</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.features}</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.pricing}</a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.security}</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">{t.nav.login}</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/auth">{t.landing.cta.primary}</Link>
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
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance leading-tight">
              {t.landing.headline}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              {t.landing.subheadline}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth">
                  {t.landing.cta.primary}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" onClick={handleViewDemo}>
                {t.landing.cta.secondary}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              {t.landing.cta.disclaimer}
            </p>
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
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="metric-card group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
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
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Dashboard Preview */}
            <div className="metric-card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-medium text-foreground">{t.landing.preview.dashboard}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">MRR</p>
                    <p className="text-lg font-bold text-foreground whitespace-nowrap tabular-nums">$45,200</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">Growth</p>
                    <p className="text-lg font-bold text-success whitespace-nowrap tabular-nums">+12.5%</p>
                  </div>
                </div>
                <div className="h-32 bg-muted/30 rounded-lg flex items-end p-2 gap-1">
                  {[40, 55, 45, 60, 75, 65, 80, 90, 85, 95, 88, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/60 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Valuation Preview */}
            <div className="metric-card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-medium text-foreground">{t.landing.preview.valuation}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">Current Valuation</p>
                  <p className="text-2xl font-bold text-foreground whitespace-nowrap tabular-nums">$5.4M</p>
                  <p className="text-xs text-primary tabular-nums">12x ARR</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">3 months</p>
                    <p className="text-sm font-bold text-foreground whitespace-nowrap tabular-nums">$52K</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">6 months</p>
                    <p className="text-sm font-bold text-foreground whitespace-nowrap tabular-nums">$61K</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">12 months</p>
                    <p className="text-sm font-bold text-foreground whitespace-nowrap tabular-nums">$82K</p>
                  </div>
                </div>
              </div>
            </div>
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

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="metric-card">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{t.pricing.starter.name}</h3>
                <p className="text-sm text-muted-foreground">{t.pricing.starter.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{t.pricing.starter.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {t.pricing.starter.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth">{t.pricing.starter.cta}</Link>
              </Button>
            </div>

            {/* Pro */}
            <div className="metric-card relative border-primary ring-1 ring-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {t.pricing.pro.popular}
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{t.pricing.pro.name}</h3>
                <p className="text-sm text-muted-foreground">{t.pricing.pro.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{t.pricing.pro.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {t.pricing.pro.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="w-full" asChild>
                <Link to="/auth">{t.pricing.pro.cta}</Link>
              </Button>
            </div>

            {/* Enterprise */}
            <div className="metric-card">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{t.pricing.enterprise.name}</h3>
                <p className="text-sm text-muted-foreground">{t.pricing.enterprise.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{t.pricing.enterprise.price}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {t.pricing.enterprise.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth">{t.pricing.enterprise.cta}</Link>
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

      {/* Testimonials */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.landing.testimonials.title}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="metric-card">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-medium text-foreground">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
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
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth">
                  {t.landing.cta2.button}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">GestorNiq</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
