-- Create enum for membership roles
CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'member');

-- Create enum for trial status
CREATE TYPE public.trial_status AS ENUM ('active', 'expired', 'cancelled');

-- Create enum for data source type
CREATE TYPE public.data_source_type AS ENUM ('demo', 'manual', 'csv', 'stripe');

-- Add onboarding_completed column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_source public.data_source_type DEFAULT 'manual';

-- Create trials table
CREATE TABLE public.trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '3 days'),
  status public.trial_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS on trials
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;

-- RLS policies for trials
CREATE POLICY "Users can view their company trial"
ON public.trials FOR SELECT
USING (EXISTS (
  SELECT 1 FROM companies
  WHERE companies.id = trials.company_id
  AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can update their company trial"
ON public.trials FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM companies
  WHERE companies.id = trials.company_id
  AND companies.user_id = auth.uid()
));

-- Create function to auto-create trial when company is created
CREATE OR REPLACE FUNCTION public.handle_new_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.trials (company_id, started_at, ends_at, status)
  VALUES (NEW.id, now(), now() + interval '3 days', 'active');
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating trial
CREATE TRIGGER on_company_created_create_trial
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_trial();

-- Function to check and update expired trials
CREATE OR REPLACE FUNCTION public.check_trial_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.trials
  SET status = 'expired'
  WHERE status = 'active' AND ends_at < now();
END;
$$;