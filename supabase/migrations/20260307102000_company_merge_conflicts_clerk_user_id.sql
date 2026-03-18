BEGIN;

ALTER TABLE public.company_merge_conflicts
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

UPDATE public.company_merge_conflicts cmc
SET clerk_user_id = COALESCE(
  cmc.clerk_user_id,
  (
    SELECT c.clerk_user_id
    FROM public.companies c
    WHERE c.user_id IS NOT DISTINCT FROM cmc.user_id
      AND c.clerk_user_id IS NOT NULL
    ORDER BY c.created_at ASC
    LIMIT 1
  ),
  cmc.user_id::text
)
WHERE cmc.clerk_user_id IS NULL;

CREATE INDEX IF NOT EXISTS company_merge_conflicts_clerk_user_id_idx
  ON public.company_merge_conflicts (clerk_user_id);

ALTER TABLE public.company_merge_conflicts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.company_merge_conflicts TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.company_merge_conflicts FROM authenticated;

DROP POLICY IF EXISTS "Users can view own conflicts" ON public.company_merge_conflicts;
DROP POLICY IF EXISTS "Users can view their own merge conflicts" ON public.company_merge_conflicts;

CREATE POLICY "Users can view own conflicts"
ON public.company_merge_conflicts
FOR SELECT
USING (clerk_user_id = public.clerk_user_id());

COMMIT;
