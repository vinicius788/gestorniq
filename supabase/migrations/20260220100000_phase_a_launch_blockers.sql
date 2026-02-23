BEGIN;

-- Phase A blockers remediation:
-- 1) enforce backend paywall via RLS + has_active_access()
-- 2) close trial reset loophole by enforcing one company per user
-- 3) remove direct client insert/delete access to companies
-- 4) add controlled backend path to ensure a single company per user

CREATE TABLE IF NOT EXISTS public.company_merge_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  conflict_key JSONB NOT NULL,
  canonical_record JSONB NOT NULL,
  duplicate_record JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_merge_conflicts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_merge_conflicts FROM anon;
REVOKE ALL ON public.company_merge_conflicts FROM authenticated;

-- Build deterministic canonical company mapping (oldest created_at wins; id tie-breaker).
CREATE TEMP TABLE tmp_company_ranked ON COMMIT DROP AS
SELECT
  c.id AS company_id,
  c.user_id,
  c.created_at,
  c.updated_at,
  c.name,
  c.currency,
  c.data_source,
  c.onboarding_completed,
  c.onboarding_completed_at,
  FIRST_VALUE(c.id) OVER (
    PARTITION BY c.user_id
    ORDER BY c.created_at ASC, c.id ASC
  ) AS canonical_company_id,
  ROW_NUMBER() OVER (
    PARTITION BY c.user_id
    ORDER BY c.created_at ASC, c.id ASC
  ) AS company_rank
FROM public.companies c;

CREATE TEMP TABLE tmp_company_duplicates ON COMMIT DROP AS
SELECT
  user_id,
  canonical_company_id,
  company_id AS duplicate_company_id
FROM tmp_company_ranked
WHERE company_rank > 1;

-- Preserve the most recently updated profile data into canonical companies.
WITH latest_company_profile AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    canonical_company_id,
    name,
    currency,
    data_source,
    onboarding_completed,
    onboarding_completed_at
  FROM tmp_company_ranked
  ORDER BY user_id, onboarding_completed DESC, updated_at DESC, created_at DESC, company_id DESC
)
UPDATE public.companies c
SET
  name = lcp.name,
  currency = lcp.currency,
  data_source = lcp.data_source,
  onboarding_completed = lcp.onboarding_completed,
  onboarding_completed_at = COALESCE(lcp.onboarding_completed_at, c.onboarding_completed_at),
  updated_at = now()
FROM latest_company_profile lcp
WHERE c.id = lcp.canonical_company_id;

-- Capture and merge revenue snapshot conflicts.
INSERT INTO public.company_merge_conflicts (user_id, table_name, conflict_key, canonical_record, duplicate_record)
SELECT
  d.user_id,
  'revenue_snapshots',
  jsonb_build_object('date', dup.date),
  to_jsonb(canonical.*),
  to_jsonb(dup.*)
FROM tmp_company_duplicates d
JOIN public.revenue_snapshots dup
  ON dup.company_id = d.duplicate_company_id
JOIN public.revenue_snapshots canonical
  ON canonical.company_id = d.canonical_company_id
 AND canonical.date = dup.date;

INSERT INTO public.revenue_snapshots (
  company_id,
  date,
  mrr,
  new_mrr,
  expansion_mrr,
  churned_mrr,
  source,
  created_at
)
SELECT
  d.canonical_company_id,
  rs.date,
  rs.mrr,
  rs.new_mrr,
  rs.expansion_mrr,
  rs.churned_mrr,
  rs.source,
  rs.created_at
FROM tmp_company_duplicates d
JOIN public.revenue_snapshots rs
  ON rs.company_id = d.duplicate_company_id
ON CONFLICT (company_id, date)
DO UPDATE
SET
  mrr = CASE WHEN EXCLUDED.created_at >= public.revenue_snapshots.created_at THEN EXCLUDED.mrr ELSE public.revenue_snapshots.mrr END,
  new_mrr = CASE WHEN EXCLUDED.created_at >= public.revenue_snapshots.created_at THEN EXCLUDED.new_mrr ELSE public.revenue_snapshots.new_mrr END,
  expansion_mrr = CASE WHEN EXCLUDED.created_at >= public.revenue_snapshots.created_at THEN EXCLUDED.expansion_mrr ELSE public.revenue_snapshots.expansion_mrr END,
  churned_mrr = CASE WHEN EXCLUDED.created_at >= public.revenue_snapshots.created_at THEN EXCLUDED.churned_mrr ELSE public.revenue_snapshots.churned_mrr END,
  source = CASE WHEN EXCLUDED.created_at >= public.revenue_snapshots.created_at THEN EXCLUDED.source ELSE public.revenue_snapshots.source END,
  created_at = LEAST(public.revenue_snapshots.created_at, EXCLUDED.created_at);

-- Capture and merge user metric conflicts.
INSERT INTO public.company_merge_conflicts (user_id, table_name, conflict_key, canonical_record, duplicate_record)
SELECT
  d.user_id,
  'user_metrics',
  jsonb_build_object('date', dup.date),
  to_jsonb(canonical.*),
  to_jsonb(dup.*)
FROM tmp_company_duplicates d
JOIN public.user_metrics dup
  ON dup.company_id = d.duplicate_company_id
JOIN public.user_metrics canonical
  ON canonical.company_id = d.canonical_company_id
 AND canonical.date = dup.date;

INSERT INTO public.user_metrics (
  company_id,
  date,
  total_users,
  new_users,
  active_users,
  churned_users,
  source,
  created_at
)
SELECT
  d.canonical_company_id,
  um.date,
  um.total_users,
  um.new_users,
  um.active_users,
  um.churned_users,
  um.source,
  um.created_at
FROM tmp_company_duplicates d
JOIN public.user_metrics um
  ON um.company_id = d.duplicate_company_id
ON CONFLICT (company_id, date)
DO UPDATE
SET
  total_users = CASE WHEN EXCLUDED.created_at >= public.user_metrics.created_at THEN EXCLUDED.total_users ELSE public.user_metrics.total_users END,
  new_users = CASE WHEN EXCLUDED.created_at >= public.user_metrics.created_at THEN EXCLUDED.new_users ELSE public.user_metrics.new_users END,
  active_users = CASE WHEN EXCLUDED.created_at >= public.user_metrics.created_at THEN EXCLUDED.active_users ELSE public.user_metrics.active_users END,
  churned_users = CASE WHEN EXCLUDED.created_at >= public.user_metrics.created_at THEN EXCLUDED.churned_users ELSE public.user_metrics.churned_users END,
  source = CASE WHEN EXCLUDED.created_at >= public.user_metrics.created_at THEN EXCLUDED.source ELSE public.user_metrics.source END,
  created_at = LEAST(public.user_metrics.created_at, EXCLUDED.created_at);

-- Capture and merge valuation snapshot conflicts.
INSERT INTO public.company_merge_conflicts (user_id, table_name, conflict_key, canonical_record, duplicate_record)
SELECT
  d.user_id,
  'valuation_snapshots',
  jsonb_build_object('date', dup.date),
  to_jsonb(canonical.*),
  to_jsonb(dup.*)
FROM tmp_company_duplicates d
JOIN public.valuation_snapshots dup
  ON dup.company_id = d.duplicate_company_id
JOIN public.valuation_snapshots canonical
  ON canonical.company_id = d.canonical_company_id
 AND canonical.date = dup.date;

INSERT INTO public.valuation_snapshots (
  company_id,
  date,
  mrr_growth_rate,
  user_growth_rate,
  valuation_multiple,
  arr,
  valuation,
  created_at
)
SELECT
  d.canonical_company_id,
  vs.date,
  vs.mrr_growth_rate,
  vs.user_growth_rate,
  vs.valuation_multiple,
  vs.arr,
  vs.valuation,
  vs.created_at
FROM tmp_company_duplicates d
JOIN public.valuation_snapshots vs
  ON vs.company_id = d.duplicate_company_id
ON CONFLICT (company_id, date)
DO UPDATE
SET
  mrr_growth_rate = CASE WHEN EXCLUDED.created_at >= public.valuation_snapshots.created_at THEN EXCLUDED.mrr_growth_rate ELSE public.valuation_snapshots.mrr_growth_rate END,
  user_growth_rate = CASE WHEN EXCLUDED.created_at >= public.valuation_snapshots.created_at THEN EXCLUDED.user_growth_rate ELSE public.valuation_snapshots.user_growth_rate END,
  valuation_multiple = CASE WHEN EXCLUDED.created_at >= public.valuation_snapshots.created_at THEN EXCLUDED.valuation_multiple ELSE public.valuation_snapshots.valuation_multiple END,
  arr = CASE WHEN EXCLUDED.created_at >= public.valuation_snapshots.created_at THEN EXCLUDED.arr ELSE public.valuation_snapshots.arr END,
  valuation = CASE WHEN EXCLUDED.created_at >= public.valuation_snapshots.created_at THEN EXCLUDED.valuation ELSE public.valuation_snapshots.valuation END,
  created_at = LEAST(public.valuation_snapshots.created_at, EXCLUDED.created_at);

-- Consolidate trials (preserve earliest lifecycle dates to block trial-extension loopholes).
INSERT INTO public.company_merge_conflicts (user_id, table_name, conflict_key, canonical_record, duplicate_record)
SELECT
  d.user_id,
  'trials',
  jsonb_build_object('company_id', d.canonical_company_id),
  to_jsonb(canonical.*),
  to_jsonb(dup.*)
FROM tmp_company_duplicates d
JOIN public.trials dup
  ON dup.company_id = d.duplicate_company_id
JOIN public.trials canonical
  ON canonical.company_id = d.canonical_company_id;

UPDATE public.trials t
SET company_id = d.canonical_company_id
FROM tmp_company_duplicates d
LEFT JOIN public.trials canonical
  ON canonical.company_id = d.canonical_company_id
WHERE t.company_id = d.duplicate_company_id
  AND canonical.id IS NULL;

UPDATE public.trials canonical
SET
  started_at = LEAST(canonical.started_at, dup.started_at),
  ends_at = LEAST(canonical.ends_at, dup.ends_at),
  status = CASE
    WHEN LEAST(canonical.ends_at, dup.ends_at) < now() THEN 'expired'::public.trial_status
    ELSE canonical.status
  END
FROM tmp_company_duplicates d
JOIN public.trials dup
  ON dup.company_id = d.duplicate_company_id
WHERE canonical.company_id = d.canonical_company_id;

DELETE FROM public.trials t
USING tmp_company_duplicates d
WHERE t.company_id = d.duplicate_company_id;

-- Consolidate Stripe revenue connections (latest updated_at wins).
INSERT INTO public.company_merge_conflicts (user_id, table_name, conflict_key, canonical_record, duplicate_record)
SELECT
  d.user_id,
  'stripe_connections',
  jsonb_build_object('company_id', d.canonical_company_id),
  to_jsonb(canonical.*),
  to_jsonb(dup.*)
FROM tmp_company_duplicates d
JOIN public.stripe_connections dup
  ON dup.company_id = d.duplicate_company_id
JOIN public.stripe_connections canonical
  ON canonical.company_id = d.canonical_company_id;

INSERT INTO public.stripe_connections (
  company_id,
  stripe_account_id,
  api_key_secret,
  key_last4,
  livemode,
  status,
  connected_at,
  last_synced_at,
  created_at,
  updated_at
)
SELECT
  d.canonical_company_id,
  sc.stripe_account_id,
  sc.api_key_secret,
  sc.key_last4,
  sc.livemode,
  sc.status,
  sc.connected_at,
  sc.last_synced_at,
  sc.created_at,
  sc.updated_at
FROM tmp_company_duplicates d
JOIN public.stripe_connections sc
  ON sc.company_id = d.duplicate_company_id
ON CONFLICT (company_id)
DO UPDATE
SET
  stripe_account_id = CASE WHEN EXCLUDED.updated_at >= public.stripe_connections.updated_at THEN EXCLUDED.stripe_account_id ELSE public.stripe_connections.stripe_account_id END,
  api_key_secret = CASE WHEN EXCLUDED.updated_at >= public.stripe_connections.updated_at THEN EXCLUDED.api_key_secret ELSE public.stripe_connections.api_key_secret END,
  key_last4 = CASE WHEN EXCLUDED.updated_at >= public.stripe_connections.updated_at THEN EXCLUDED.key_last4 ELSE public.stripe_connections.key_last4 END,
  livemode = CASE WHEN EXCLUDED.updated_at >= public.stripe_connections.updated_at THEN EXCLUDED.livemode ELSE public.stripe_connections.livemode END,
  status = CASE WHEN EXCLUDED.updated_at >= public.stripe_connections.updated_at THEN EXCLUDED.status ELSE public.stripe_connections.status END,
  connected_at = LEAST(public.stripe_connections.connected_at, EXCLUDED.connected_at),
  last_synced_at = GREATEST(public.stripe_connections.last_synced_at, EXCLUDED.last_synced_at),
  updated_at = GREATEST(public.stripe_connections.updated_at, EXCLUDED.updated_at);

DELETE FROM public.stripe_connections sc
USING tmp_company_duplicates d
WHERE sc.company_id = d.duplicate_company_id;

-- Finally remove duplicate companies.
DELETE FROM public.companies c
USING tmp_company_duplicates d
WHERE c.id = d.duplicate_company_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND conname = 'companies_user_id_key'
  ) THEN
    ALTER TABLE public.companies
    ADD CONSTRAINT companies_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS subscriptions_user_id_updated_at_idx
  ON public.subscriptions (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = user_uuid
      AND COALESCE(lower(s.plan), 'free') <> 'free'
      AND lower(s.status) IN ('active', 'trialing', 'past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end >= now())
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.trials t ON t.company_id = c.id
    WHERE c.user_id = user_uuid
      AND t.status = 'active'::public.trial_status
      AND t.ends_at >= now()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_company_for_current_user()
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user UUID := auth.uid();
  company_row public.companies%ROWTYPE;
BEGIN
  IF current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO company_row
  FROM public.companies
  WHERE user_id = current_user
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN company_row;
  END IF;

  INSERT INTO public.companies (
    user_id,
    name,
    currency,
    onboarding_completed,
    onboarding_completed_at,
    data_source
  )
  VALUES (
    current_user,
    'My Startup',
    'USD',
    FALSE,
    NULL,
    'demo'::public.data_source_type
  )
  RETURNING * INTO company_row;

  RETURN company_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO service_role;

-- Lock down companies writes from direct client usage.
DROP POLICY IF EXISTS "Users can create their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;

CREATE POLICY "Users can update their own companies with active access"
ON public.companies
FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.has_active_access(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  AND public.has_active_access(auth.uid())
);

-- Ensure trial/subscription mutations remain restricted to trusted contexts.
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their company trial" ON public.trials;

-- Enforce paywall on metrics data via RLS (ownership + active access).
DROP POLICY IF EXISTS "Users can view their company revenue" ON public.revenue_snapshots;
DROP POLICY IF EXISTS "Users can insert their company revenue" ON public.revenue_snapshots;
DROP POLICY IF EXISTS "Users can update their company revenue" ON public.revenue_snapshots;
DROP POLICY IF EXISTS "Users can delete their company revenue" ON public.revenue_snapshots;

CREATE POLICY "Users with active access can view revenue"
ON public.revenue_snapshots
FOR SELECT
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can insert revenue"
ON public.revenue_snapshots
FOR INSERT
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can update revenue"
ON public.revenue_snapshots
FOR UPDATE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can delete revenue"
ON public.revenue_snapshots
FOR DELETE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their company metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Users can insert their company metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Users can update their company metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Users can delete their company metrics" ON public.user_metrics;

CREATE POLICY "Users with active access can view user metrics"
ON public.user_metrics
FOR SELECT
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can insert user metrics"
ON public.user_metrics
FOR INSERT
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can update user metrics"
ON public.user_metrics
FOR UPDATE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can delete user metrics"
ON public.user_metrics
FOR DELETE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their company valuation" ON public.valuation_snapshots;
DROP POLICY IF EXISTS "Users can insert their company valuation" ON public.valuation_snapshots;
DROP POLICY IF EXISTS "Users can update their company valuation" ON public.valuation_snapshots;
DROP POLICY IF EXISTS "Users can delete their company valuation" ON public.valuation_snapshots;

CREATE POLICY "Users with active access can view valuation"
ON public.valuation_snapshots
FOR SELECT
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can insert valuation"
ON public.valuation_snapshots
FOR INSERT
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can update valuation"
ON public.valuation_snapshots
FOR UPDATE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users with active access can delete valuation"
ON public.valuation_snapshots
FOR DELETE
USING (
  public.has_active_access(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

COMMIT;
