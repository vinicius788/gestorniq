-- Normalize legacy paid plan slugs to the single Standard plan.
UPDATE public.subscriptions
SET
  plan = 'standard',
  updated_at = NOW()
WHERE plan IS NOT NULL
  AND LOWER(plan) NOT IN ('free', 'standard');
