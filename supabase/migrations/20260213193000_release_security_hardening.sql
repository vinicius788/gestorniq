-- Release hardening: lock down client-side billing and trial mutations
-- and prevent public RPC execution for trial expiry maintenance.

BEGIN;

-- Users must not be able to mutate billing state from the client.
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Users must not be able to extend or alter trial lifecycle from the client.
DROP POLICY IF EXISTS "Users can update their company trial" ON public.trials;

-- Trial expiry maintenance should only run from trusted server contexts.
REVOKE ALL ON FUNCTION public.check_trial_expiry() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_trial_expiry() FROM anon;
REVOKE ALL ON FUNCTION public.check_trial_expiry() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_trial_expiry() TO service_role;

COMMIT;
