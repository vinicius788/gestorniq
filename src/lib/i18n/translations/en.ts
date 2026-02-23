// Translation type definition
export interface Translations {
  common: {
    loading: string;
    save: string;
    cancel: string;
    next: string;
    back: string;
    confirm: string;
    start: string;
    close: string;
    comingSoon: string;
    noData: string;
    notEnoughData: string;
    healthy: string;
    warning: string;
    attention: string;
    excellent: string;
    strong: string;
    growing: string;
    stable: string;
    declining: string;
  };
  nav: {
    features: string;
    pricing: string;
    security: string;
    login: string;
    getStarted: string;
    dashboard: string;
    revenue: string;
    userGrowth: string;
    valuation: string;
    equity: string;
    settings: string;
    logout: string;
  };
  landing: {
    badge: string;
    headline: string;
    subheadline: string;
    cta: {
      primary: string;
      secondary: string;
      disclaimer: string;
    };
    features: {
      title: string;
      subtitle: string;
      mrr: { title: string; description: string };
      forecast: { title: string; description: string };
      valuation: { title: string; description: string };
      reports: { title: string; description: string };
    };
    howItWorks: {
      title: string;
      step1: { title: string; description: string };
      step2: { title: string; description: string };
      step3: { title: string; description: string };
    };
    preview: { title: string; dashboard: string; valuation: string };
    security: { title: string; description: string; badges: string[] };
    testimonials: { title: string };
    cta2: { title: string; subtitle: string; button: string };
  };
  pricing: {
    title: string;
    subtitle: string;
    trial: string;
    perMonth: string;
    billedAnnually: string;
    standard: {
      name: string;
      price: string;
      annualPrice: string;
      description: string;
      badge: string;
      features: string[];
      cta: string;
    };
  };
  auth: {
    welcomeBack: string;
    createAccount: string;
    loginSubtitle: string;
    signupSubtitle: string;
    fullName: string;
    email: string;
    password: string;
    login: string;
    signup: string;
    noAccount: string;
    hasAccount: string;
    continueWithGoogle: string;
    or: string;
    backToHome: string;
    invalidEmail: string;
    invalidPassword: string;
    nameRequired: string;
    invalidCredentials: string;
    emailInUse: string;
    loginSuccess: string;
    signupSuccess: string;
    googleError: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    demoMode: string;
    emptyState: { title: string; description: string; addRevenue: string; addUsers: string };
    metrics: {
      mrr: string;
      arr: string;
      mrrGrowth: string;
      valuation: string;
      totalUsers: string;
      newUsers: string;
      growthRate: string;
      activeCustomers: string;
      churnRate: string;
      arpu: string;
      thisMonth: string;
      vsPrevious: string;
      mom: string;
      atMultiple: string;
      estimatedLtv: string;
    };
  };
  revenue: {
    title: string;
    subtitle: string;
    mrrBreakdown: string;
    newMrr: string;
    expansionMrr: string;
    churnedMrr: string;
    netNewMrr: string;
    addEntry: string;
    history: string;
  };
  userGrowth: {
    title: string;
    subtitle: string;
    metrics: {
      totalUsers: string;
      newUsers: string;
      activeUsers: string;
      churnedUsers: string;
      growthRate: string;
      churnRate: string;
    };
  };
  valuation: {
    title: string;
    subtitle: string;
    currentValuation: string;
    basedOn: string;
    multiple: string;
    suggestedMultiple: string;
    customMultiple: string;
    forecast: {
      title: string;
      months3: string;
      months6: string;
      months12: string;
      projectedMrr: string;
      projectedArr: string;
      projectedValuation: string;
    };
  };
  equity: {
    title: string;
    subtitle: string;
    stake: string;
    value: string;
    basedOnValuation: string;
  };
  settings: {
    title: string;
    subtitle: string;
    profile: string;
    fullName: string;
    email: string;
    company: string;
    saveChanges: string;
    integration: string;
    integrationConnected: string;
    integrationLastSync: string;
    integrationDescription: string;
    connectRevenue: string;
    stripeNote: string;
    disconnect: string;
    appearance: string;
    darkMode: string;
    darkModeDescription: string;
    language: string;
    languageDescription: string;
    notifications: string;
    emailNotifications: string;
    emailNotificationsDescription: string;
    weeklyReports: string;
    weeklyReportsDescription: string;
    security: string;
    changePassword: string;
    enable2fa: string;
    plan: string;
    currentPlan: string;
    upgradePlan: string;
    trialEnds: string;
    manageBilling: string;
  };
  onboarding: {
    title: string;
    step1: { title: string; subtitle: string; companyName: string; companyPlaceholder: string; baseCurrency: string };
    step2: { title: string; subtitle: string; manual: string; manualDescription: string; csv: string; csvDescription: string; stripe: string; stripeDescription: string; tip: string };
    step3: { title: string; subtitle: string; companyLabel: string; currencyLabel: string; dataSourceLabel: string; demoTip: string; useDemoMode: string };
  };
  timeframe: { '30d': string; '90d': string; '12m': string; all: string };
  currencies: { USD: string; EUR: string; GBP: string; BRL: string };
  dataSources: { manual: string; csv: string; stripe: string; firebase: string; posthog: string; ga4: string; supabase: string };
  footer: { copyright: string };
}

export const en: Translations = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    next: 'Next',
    back: 'Back',
    confirm: 'Confirm',
    start: 'Start',
    close: 'Close',
    comingSoon: 'Coming soon',
    noData: 'No data',
    notEnoughData: 'Not enough data',
    healthy: 'Healthy',
    warning: 'Warning',
    attention: 'Attention',
    excellent: 'Excellent',
    strong: 'Strong',
    growing: 'Growing',
    stable: 'Stable',
    declining: 'Declining',
  },
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    security: 'Security',
    login: 'Login',
    getStarted: 'Get Started',
    dashboard: 'Dashboard',
    revenue: 'Revenue',
    userGrowth: 'User Growth',
    valuation: 'Valuation',
    equity: 'Equity',
    settings: 'Settings',
    logout: 'Logout',
  },
  landing: {
    badge: 'Your Autonomous CFO for fundraising',
    headline: "Turn SaaS metrics into confidence for your next investor conversation.",
    subheadline: 'Connect Stripe with a read-only key or start with demo/manual/CSV input. Track Net New MRR, Expansion, Churn, 3/6/12-month forecasts, valuation, and equity pricing in one investor-ready dashboard.',
    cta: {
      primary: 'Start my investor-ready trial',
      secondary: 'View demo data',
      disclaimer: 'No card required for trial. Cancel anytime.',
    },
    features: {
      title: 'VC-ready metrics, built for founders',
      subtitle: 'Stop wasting time on spreadsheets. Get investor-grade insights in one dashboard.',
      mrr: {
        title: 'MRR Breakdown (VC-Ready)',
        description: 'Net New MRR, Expansion, Contraction, and Churned MRR broken down exactly how investors want to see it.',
      },
      forecast: {
        title: 'Autonomous CFO Forecast',
        description: "3/6/12-month revenue forecasts powered by your actual growth data. See where you're headed.",
      },
      valuation: {
        title: 'Valuation & Equity Pricing',
        description: 'Calculate valuation with growth-based multiples and estimate stake value plus implied share price.',
      },
      reports: {
        title: 'Investor Pack (Reports)',
        description: 'Export investor-ready summaries (CSV/PDF) with one click. Perfect for board meetings and fundraising.',
      },
    },
    howItWorks: {
      title: 'How it works',
      step1: { title: 'Connect revenue source', description: 'Stripe-first, or start with Demo mode, manual entry, or CSV import.' },
      step2: { title: 'We compute VC-ready metrics', description: 'MRR breakdown, growth rates, and forecasts.' },
      step3: { title: 'Get investor insights', description: 'Valuation, stake/share pricing, and exportable summaries.' },
    },
    preview: { title: 'Product Preview', dashboard: 'Dashboard View', valuation: 'Valuation & Forecast' },
    security: {
      title: 'Security you can trust',
      description: 'Your data is encrypted in transit. We follow security best practices and use read-only access to your payment data.',
      badges: ['Read-only access', 'Data encrypted in transit', 'Security best practices'],
    },
    testimonials: { title: 'Loved by founders' },
    cta2: { title: 'Ready to know your numbers?', subtitle: 'Start your 3-day free trial. No credit card required.', button: 'Start free trial' },
  },
  pricing: {
    title: 'Simple, transparent pricing',
    subtitle: 'One plan. 3-day free trial. Cancel anytime.',
    trial: '3-day free trial',
    perMonth: '/month',
    billedAnnually: 'Billed annually',
    standard: {
      name: 'Standard',
      price: '$39',
      annualPrice: '$468',
      description: 'For SaaS founders who need investor-ready metrics',
      badge: 'Standard Plan',
      features: [
        'Core metrics (MRR/ARR/Growth)',
        'Net New MRR, expansion, contraction, and churn views',
        'Autonomous CFO forecasts (3/6/12m)',
        'Valuation scenarios and equity/share pricing',
        'Investor Pack export (CSV/PDF)',
        'Stripe revenue sync + manual/CSV input',
      ],
      cta: 'Start free trial',
    },
  },
  auth: {
    welcomeBack: 'Welcome back',
    createAccount: 'Create account',
    loginSubtitle: 'Access your investor-ready dashboard and growth metrics',
    signupSubtitle: 'Create your account and structure your SaaS narrative in minutes',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    signup: 'Create account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    continueWithGoogle: 'Continue with Google',
    or: 'or',
    backToHome: '← Back to home',
    invalidEmail: 'Invalid email',
    invalidPassword: 'Password must be at least 6 characters',
    nameRequired: 'Name is required',
    invalidCredentials: 'Invalid email or password',
    emailInUse: 'This email is already registered',
    loginSuccess: 'Login successful!',
    signupSuccess: 'Account created successfully!',
    googleError: 'Error signing in with Google',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Real-time metrics',
    demoMode: '(Demo Mode)',
    emptyState: {
      title: 'No data yet',
      description: 'Start by adding revenue and user data to see your metrics.',
      addRevenue: 'Add Revenue →',
      addUsers: 'Add Users →',
    },
    metrics: {
      mrr: 'Monthly Recurring Revenue',
      arr: 'Annual Recurring Revenue',
      mrrGrowth: 'Revenue Growth',
      valuation: 'Estimated Valuation',
      totalUsers: 'Total Users',
      newUsers: 'New Users (30d)',
      growthRate: 'Growth Rate',
      activeCustomers: 'Active Customers',
      churnRate: 'Churn Rate',
      arpu: 'Average Revenue Per User',
      thisMonth: 'this month',
      vsPrevious: 'vs previous',
      mom: 'MoM',
      atMultiple: 'at',
      estimatedLtv: 'Estimated LTV',
    },
  },
  revenue: {
    title: 'Revenue',
    subtitle: 'Track your recurring revenue metrics',
    mrrBreakdown: 'MRR Breakdown',
    newMrr: 'New MRR',
    expansionMrr: 'Expansion MRR',
    churnedMrr: 'Churned MRR',
    netNewMrr: 'Net New MRR',
    addEntry: 'Add Entry',
    history: 'Revenue History',
  },
  userGrowth: {
    title: 'User Growth',
    subtitle: 'Track your user acquisition and retention',
    metrics: {
      totalUsers: 'Total Users',
      newUsers: 'New Users',
      activeUsers: 'Active Users',
      churnedUsers: 'Churned Users',
      growthRate: 'Growth Rate',
      churnRate: 'Churn Rate',
    },
  },
  valuation: {
    title: 'Valuation',
    subtitle: 'Calculate your startup valuation',
    currentValuation: 'Current Valuation',
    basedOn: 'Based on',
    multiple: 'x ARR',
    suggestedMultiple: 'Suggested Multiple',
    customMultiple: 'Custom Multiple',
    forecast: {
      title: 'Revenue Forecast',
      months3: '3 Months',
      months6: '6 Months',
      months12: '12 Months',
      projectedMrr: 'Projected MRR',
      projectedArr: 'Projected ARR',
      projectedValuation: 'Projected Valuation',
    },
  },
  equity: {
    title: 'Equity Calculator',
    subtitle: 'Calculate equity stake values',
    stake: 'Equity Stake',
    value: 'Value',
    basedOnValuation: 'Based on valuation of',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your account and preferences',
    profile: 'Profile',
    fullName: 'Full Name',
    email: 'Email',
    company: 'Company',
    saveChanges: 'Save Changes',
    integration: 'Revenue Source Integration',
    integrationConnected: 'Connected',
    integrationLastSync: 'Last synced',
    integrationDescription: 'Connect your revenue source to automatically sync your data and metrics.',
    connectRevenue: 'Connect Revenue Source',
    stripeNote: 'Stripe-first. More gateways soon.',
    disconnect: 'Disconnect',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    darkModeDescription: 'Use dark theme',
    language: 'Language',
    languageDescription: 'Choose your preferred language',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    emailNotificationsDescription: 'Receive email alerts',
    weeklyReports: 'Weekly Reports',
    weeklyReportsDescription: 'Get weekly summary',
    security: 'Security',
    changePassword: 'Change Password',
    enable2fa: 'Enable Two-Factor Auth',
    plan: 'Plan',
    currentPlan: 'Current Plan',
    upgradePlan: 'Upgrade Plan',
    trialEnds: 'Trial ends',
    manageBilling: 'Manage Billing',
  },
  onboarding: {
    title: 'Initial Setup',
    step1: { title: 'About your Startup', subtitle: 'Set up company name and base currency', companyName: 'Company Name', companyPlaceholder: 'My Startup', baseCurrency: 'Base Currency' },
    step2: { title: 'Data Source', subtitle: 'How will you add your metrics?', manual: 'Manual Entry', manualDescription: 'Add data manually through the dashboard', csv: 'CSV Import', csvDescription: 'Import data via CSV files', stripe: 'Stripe (Beta)', stripeDescription: 'Connect Stripe to sync recurring revenue snapshots automatically.', tip: 'Use a restricted read-only key and sync from Settings at any time.' },
    step3: { title: 'All Set!', subtitle: 'Review your settings', companyLabel: 'Company', currencyLabel: 'Currency', dataSourceLabel: 'Data Source', demoTip: 'Want to explore first? Enable Demo Mode to see sample metrics.', useDemoMode: 'Use Demo Mode' },
  },
  timeframe: { '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months', all: 'All time' },
  currencies: { USD: 'US Dollar ($)', EUR: 'Euro (€)', GBP: 'British Pound (£)', BRL: 'Brazilian Real (R$)' },
  dataSources: { manual: 'Manual Entry', csv: 'CSV Import', stripe: 'Stripe', firebase: 'Firebase', posthog: 'PostHog', ga4: 'Google Analytics', supabase: 'Supabase' },
  footer: { copyright: '© 2024 GestorNiq. All rights reserved.' },
};
