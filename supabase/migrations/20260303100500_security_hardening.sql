BEGIN;

-- SECURITY DEFINER note:
-- - public.has_active_access() is safe for authenticated callers because it binds to auth.uid().
-- - public.has_active_access(user_uuid) can evaluate arbitrary users and is restricted to service_role.

CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
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
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end > now()
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

CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.has_active_access(auth.uid());
END;
$$;

COMMENT ON FUNCTION public.has_active_access(UUID)
IS 'SECURITY DEFINER restricted to service_role: evaluates arbitrary user UUIDs.';

REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.has_active_access(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.has_active_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO service_role;

ALTER POLICY "Users can update their own companies with active access"
ON public.companies
USING (
  auth.uid() = user_id
  AND public.has_active_access()
);

ALTER POLICY "Users can update their own companies with active access"
ON public.companies
WITH CHECK (
  auth.uid() = user_id
  AND public.has_active_access()
);

ALTER POLICY "Users with active access can view revenue"
ON public.revenue_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can insert revenue"
ON public.revenue_snapshots
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update revenue"
ON public.revenue_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update revenue"
ON public.revenue_snapshots
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can delete revenue"
ON public.revenue_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = revenue_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can view user metrics"
ON public.user_metrics
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can insert user metrics"
ON public.user_metrics
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update user metrics"
ON public.user_metrics
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update user metrics"
ON public.user_metrics
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can delete user metrics"
ON public.user_metrics
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = user_metrics.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can view valuation"
ON public.valuation_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can insert valuation"
ON public.valuation_snapshots
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update valuation"
ON public.valuation_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can update valuation"
ON public.valuation_snapshots
WITH CHECK (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

ALTER POLICY "Users with active access can delete valuation"
ON public.valuation_snapshots
USING (
  public.has_active_access()
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = valuation_snapshots.company_id
      AND c.user_id = auth.uid()
  )
);

COMMIT;
