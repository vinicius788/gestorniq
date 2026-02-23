-- Phase B: pre-launch hardening
-- - DB integrity constraints for core metrics
-- - Query indexes for core dashboard paths
-- - Shared DB-backed rate limiting primitive for Edge Functions

BEGIN;

-- Normalize invalid historical values before adding strict constraints.
UPDATE public.revenue_snapshots
SET
  mrr = GREATEST(mrr, 0),
  new_mrr = GREATEST(new_mrr, 0),
  expansion_mrr = GREATEST(expansion_mrr, 0),
  churned_mrr = GREATEST(churned_mrr, 0)
WHERE mrr < 0 OR new_mrr < 0 OR expansion_mrr < 0 OR churned_mrr < 0;

UPDATE public.user_metrics
SET
  total_users = GREATEST(total_users, 0),
  new_users = LEAST(GREATEST(new_users, 0), GREATEST(total_users, 0)),
  active_users = LEAST(GREATEST(active_users, 0), GREATEST(total_users, 0)),
  churned_users = LEAST(GREATEST(churned_users, 0), GREATEST(total_users, 0))
WHERE
  total_users < 0
  OR new_users < 0
  OR active_users < 0
  OR churned_users < 0
  OR active_users > total_users
  OR churned_users > total_users
  OR new_users > total_users;

UPDATE public.valuation_snapshots
SET
  arr = GREATEST(arr, 0),
  valuation = GREATEST(valuation, 0),
  valuation_multiple = CASE WHEN valuation_multiple <= 0 THEN 0.01 ELSE valuation_multiple END,
  mrr_growth_rate = CASE
    WHEN mrr_growth_rate IS NULL THEN NULL
    WHEN mrr_growth_rate > 1000 THEN 1000
    WHEN mrr_growth_rate < -1000 THEN -1000
    ELSE mrr_growth_rate
  END,
  user_growth_rate = CASE
    WHEN user_growth_rate IS NULL THEN NULL
    WHEN user_growth_rate > 1000 THEN 1000
    WHEN user_growth_rate < -1000 THEN -1000
    ELSE user_growth_rate
  END
WHERE
  arr < 0
  OR valuation < 0
  OR valuation_multiple <= 0
  OR (mrr_growth_rate IS NOT NULL AND (mrr_growth_rate > 1000 OR mrr_growth_rate < -1000))
  OR (user_growth_rate IS NOT NULL AND (user_growth_rate > 1000 OR user_growth_rate < -1000));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revenue_snapshots_non_negative_chk'
      AND conrelid = 'public.revenue_snapshots'::regclass
  ) THEN
    ALTER TABLE public.revenue_snapshots
      ADD CONSTRAINT revenue_snapshots_non_negative_chk
      CHECK (mrr >= 0 AND new_mrr >= 0 AND expansion_mrr >= 0 AND churned_mrr >= 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_metrics_non_negative_chk'
      AND conrelid = 'public.user_metrics'::regclass
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT user_metrics_non_negative_chk
      CHECK (total_users >= 0 AND new_users >= 0 AND active_users >= 0 AND churned_users >= 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_metrics_bounds_chk'
      AND conrelid = 'public.user_metrics'::regclass
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT user_metrics_bounds_chk
      CHECK (active_users <= total_users AND churned_users <= total_users AND new_users <= total_users);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valuation_snapshots_non_negative_chk'
      AND conrelid = 'public.valuation_snapshots'::regclass
  ) THEN
    ALTER TABLE public.valuation_snapshots
      ADD CONSTRAINT valuation_snapshots_non_negative_chk
      CHECK (arr >= 0 AND valuation >= 0 AND valuation_multiple > 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valuation_snapshots_growth_range_chk'
      AND conrelid = 'public.valuation_snapshots'::regclass
  ) THEN
    ALTER TABLE public.valuation_snapshots
      ADD CONSTRAINT valuation_snapshots_growth_range_chk
      CHECK (
        (mrr_growth_rate IS NULL OR (mrr_growth_rate >= -1000 AND mrr_growth_rate <= 1000))
        AND (user_growth_rate IS NULL OR (user_growth_rate >= -1000 AND user_growth_rate <= 1000))
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS companies_user_id_idx
  ON public.companies (user_id);

CREATE INDEX IF NOT EXISTS revenue_snapshots_company_date_desc_idx
  ON public.revenue_snapshots (company_id, date DESC);

CREATE INDEX IF NOT EXISTS user_metrics_company_date_desc_idx
  ON public.user_metrics (company_id, date DESC);

CREATE INDEX IF NOT EXISTS valuation_snapshots_company_date_desc_idx
  ON public.valuation_snapshots (company_id, date DESC);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_updated_at_idx
  ON public.subscriptions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, bucket_key, window_start, window_seconds)
);

CREATE INDEX IF NOT EXISTS edge_rate_limits_scope_bucket_idx
  ON public.edge_rate_limits (scope, bucket_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS edge_rate_limits_updated_at_idx
  ON public.edge_rate_limits (updated_at DESC);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_rate_limits FROM anon;
REVOKE ALL ON public.edge_rate_limits FROM authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope TEXT,
  p_bucket_key TEXT,
  p_window_seconds INTEGER,
  p_limit INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bucket_start TIMESTAMPTZ;
  current_count INTEGER;
BEGIN
  IF p_scope IS NULL OR length(trim(p_scope)) = 0 THEN
    RAISE EXCEPTION 'p_scope must be provided';
  END IF;

  IF p_bucket_key IS NULL OR length(trim(p_bucket_key)) = 0 THEN
    RAISE EXCEPTION 'p_bucket_key must be provided';
  END IF;

  IF p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'p_window_seconds must be > 0';
  END IF;

  IF p_limit <= 0 THEN
    RAISE EXCEPTION 'p_limit must be > 0';
  END IF;

  bucket_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.edge_rate_limits (
    scope,
    bucket_key,
    window_start,
    window_seconds,
    request_count,
    created_at,
    updated_at
  )
  VALUES (
    p_scope,
    p_bucket_key,
    bucket_start,
    p_window_seconds,
    1,
    now(),
    now()
  )
  ON CONFLICT (scope, bucket_key, window_start, window_seconds)
  DO UPDATE SET
    request_count = public.edge_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO current_count;

  IF random() < 0.01 THEN
    DELETE FROM public.edge_rate_limits
    WHERE updated_at < now() - interval '7 days';
  END IF;

  allowed := current_count <= p_limit;
  remaining := GREATEST(p_limit - current_count, 0);
  reset_at := bucket_start + make_interval(secs => p_window_seconds);

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

COMMIT;
