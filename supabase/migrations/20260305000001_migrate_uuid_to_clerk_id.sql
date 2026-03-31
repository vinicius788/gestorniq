BEGIN;

-- ============================================================
-- Clerk JWT direct auth migration
-- Keep legacy UUID columns for compatibility, but switch runtime identity to clerk_user_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    auth.jwt() -> 'user_metadata' ->> 'clerk_user_id'
  )
$$;

REVOKE ALL ON FUNCTION public.clerk_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clerk_user_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clerk_user_id() TO service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

UPDATE public.profiles
SET clerk_user_id = user_id::text
WHERE clerk_user_id IS NULL;

UPDATE public.companies
SET clerk_user_id = user_id::text
WHERE clerk_user_id IS NULL;

UPDATE public.subscriptions
SET clerk_user_id = user_id::text
WHERE clerk_user_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN clerk_user_id SET NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.companies
  ALTER COLUMN clerk_user_id SET NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN clerk_user_id SET NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_key
  ON public.profiles (clerk_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS companies_clerk_user_id_key
  ON public.companies (clerk_user_id);

CREATE INDEX IF NOT EXISTS subscriptions_clerk_user_id_updated_at_idx
  ON public.subscriptions (clerk_user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.has_active_access(user_clerk_id TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF user_clerk_id IS NULL OR btrim(user_clerk_id) = '' THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.clerk_user_id = user_clerk_id
      AND COALESCE(lower(s.plan), 'free') <> 'free'
      AND lower(s.status) IN ('active', 'trialing', 'past_due')
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end > now()
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.trials t ON t.company_id = c.id
    WHERE c.clerk_user_id = user_clerk_id
      AND t.status = 'active'::public.trial_status
      AND t.ends_at >= now()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_active_access(public.clerk_user_id());
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_access(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.has_active_access(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.has_active_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_company_for_current_user()
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clerk_id TEXT := public.clerk_user_id();
  v_email TEXT := NULLIF(
    COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email'
    ),
    ''
  );
  v_full_name TEXT := NULLIF(
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() ->> 'full_name'
    ),
    ''
  );
  v_company_name TEXT;
  company_row public.companies%ROWTYPE;
BEGIN
  IF v_clerk_id IS NULL OR btrim(v_clerk_id) = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_email IS NULL THEN
    v_email := v_clerk_id || '@clerk.local';
  END IF;

  v_company_name := COALESCE(v_full_name, 'My Startup');

  INSERT INTO public.profiles (
    user_id,
    clerk_user_id,
    email,
    full_name,
    avatar_url,
    updated_at
  )
  VALUES (
    NULL,
    v_clerk_id,
    v_email,
    v_full_name,
    NULL,
    now()
  )
  ON CONFLICT (clerk_user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  SELECT *
  INTO company_row
  FROM public.companies
  WHERE clerk_user_id = v_clerk_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN company_row;
  END IF;

  INSERT INTO public.companies (
    user_id,
    clerk_user_id,
    name,
    currency,
    onboarding_completed,
    onboarding_completed_at,
    data_source
  )
  VALUES (
    NULL,
    v_clerk_id,
    v_company_name,
    'USD',
    FALSE,
    NULL,
    'demo'::public.data_source_type
  )
  RETURNING * INTO company_row;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE clerk_user_id = v_clerk_id
  ) THEN
    INSERT INTO public.subscriptions (
      user_id,
      clerk_user_id,
      plan,
      status,
      updated_at
    )
    VALUES (
      NULL,
      v_clerk_id,
      'free',
      'active',
      now()
    );
  END IF;

  RETURN company_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO service_role;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (clerk_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (clerk_user_id = public.clerk_user_id())
WITH CHECK (clerk_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (clerk_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
CREATE POLICY "Users can view their own companies"
ON public.companies
FOR SELECT
USING (clerk_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Users can update their own companies with active access" ON public.companies;
CREATE POLICY "Users can update their own companies with active access"
ON public.companies
FOR UPDATE
USING (
  clerk_user_id = public.clerk_user_id()
  AND public.has_active_access()
)
WITH CHECK (
  clerk_user_id = public.clerk_user_id()
  AND public.has_active_access()
);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (clerk_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Users can view their company trial" ON public.trials;
CREATE POLICY "Users can view their company trial"
ON public.trials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.companies
    WHERE companies.id = trials.company_id
      AND companies.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can view revenue" ON public.revenue_snapshots;
CREATE POLICY "Users with active access can view revenue"
ON public.revenue_snapshots
FOR SELECT
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can insert revenue" ON public.revenue_snapshots;
CREATE POLICY "Users with active access can insert revenue"
ON public.revenue_snapshots
FOR INSERT
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can update revenue" ON public.revenue_snapshots;
CREATE POLICY "Users with active access can update revenue"
ON public.revenue_snapshots
FOR UPDATE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
)
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can delete revenue" ON public.revenue_snapshots;
CREATE POLICY "Users with active access can delete revenue"
ON public.revenue_snapshots
FOR DELETE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can view user metrics" ON public.user_metrics;
CREATE POLICY "Users with active access can view user metrics"
ON public.user_metrics
FOR SELECT
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can insert user metrics" ON public.user_metrics;
CREATE POLICY "Users with active access can insert user metrics"
ON public.user_metrics
FOR INSERT
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can update user metrics" ON public.user_metrics;
CREATE POLICY "Users with active access can update user metrics"
ON public.user_metrics
FOR UPDATE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
)
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can delete user metrics" ON public.user_metrics;
CREATE POLICY "Users with active access can delete user metrics"
ON public.user_metrics
FOR DELETE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can view valuation" ON public.valuation_snapshots;
CREATE POLICY "Users with active access can view valuation"
ON public.valuation_snapshots
FOR SELECT
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can insert valuation" ON public.valuation_snapshots;
CREATE POLICY "Users with active access can insert valuation"
ON public.valuation_snapshots
FOR INSERT
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can update valuation" ON public.valuation_snapshots;
CREATE POLICY "Users with active access can update valuation"
ON public.valuation_snapshots
FOR UPDATE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
)
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

DROP POLICY IF EXISTS "Users with active access can delete valuation" ON public.valuation_snapshots;
CREATE POLICY "Users with active access can delete valuation"
ON public.valuation_snapshots
FOR DELETE
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.clerk_user_id = public.clerk_user_id()
  )
);

COMMIT;
