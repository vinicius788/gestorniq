-- Add dynamic billing amount fields to subscriptions.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'brl';

-- Ensure revenue snapshots keep a unique key for deterministic upserts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'revenue_snapshots'
      AND i.indisunique
      AND pg_get_indexdef(i.indexrelid) ILIKE '%(company_id, date)%'
  ) THEN
    CREATE UNIQUE INDEX idx_revenue_snapshots_company_date
      ON public.revenue_snapshots(company_id, date);
  END IF;
END $$;

-- Optional denormalized helper field used by analytics/reporting.
ALTER TABLE public.revenue_snapshots
  ADD COLUMN IF NOT EXISTS net_new_mrr NUMERIC GENERATED ALWAYS AS (
    COALESCE(new_mrr, 0) + COALESCE(expansion_mrr, 0) - COALESCE(churned_mrr, 0)
  ) STORED;
