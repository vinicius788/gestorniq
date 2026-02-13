-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create revenue_snapshots table for MRR/ARR tracking
CREATE TABLE public.revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mrr DECIMAL(15,2) NOT NULL DEFAULT 0,
  arr DECIMAL(15,2) GENERATED ALWAYS AS (mrr * 12) STORED,
  new_mrr DECIMAL(15,2) NOT NULL DEFAULT 0,
  expansion_mrr DECIMAL(15,2) NOT NULL DEFAULT 0,
  churned_mrr DECIMAL(15,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

-- Create user_metrics table for user growth tracking
CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_users INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  churned_users INTEGER NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

-- Create valuation_snapshots table for valuation history
CREATE TABLE public.valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mrr_growth_rate DECIMAL(10,4),
  user_growth_rate DECIMAL(10,4),
  valuation_multiple DECIMAL(10,2) NOT NULL DEFAULT 10,
  arr DECIMAL(15,2) NOT NULL,
  valuation DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

-- Create subscriptions table for platform billing (Stripe)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for companies
CREATE POLICY "Users can view their own companies" ON public.companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON public.companies
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for revenue_snapshots (via company ownership)
CREATE POLICY "Users can view their company revenue" ON public.revenue_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their company revenue" ON public.revenue_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their company revenue" ON public.revenue_snapshots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their company revenue" ON public.revenue_snapshots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- RLS Policies for user_metrics (via company ownership)
CREATE POLICY "Users can view their company metrics" ON public.user_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their company metrics" ON public.user_metrics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their company metrics" ON public.user_metrics
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their company metrics" ON public.user_metrics
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- RLS Policies for valuation_snapshots (via company ownership)
CREATE POLICY "Users can view their company valuation" ON public.valuation_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their company valuation" ON public.valuation_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their company valuation" ON public.valuation_snapshots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default company for user
  INSERT INTO public.companies (user_id, name)
  VALUES (NEW.id, 'My Startup');
  
  -- Create default subscription
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();