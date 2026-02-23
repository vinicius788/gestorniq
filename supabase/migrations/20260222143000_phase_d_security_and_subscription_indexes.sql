-- Phase D: blocker remediations
-- - harden audit RPC permissions to prevent actor forgery by authenticated role
-- - add webhook lookup indexes on subscription Stripe identifiers

BEGIN;

REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) TO service_role;

DO $$
BEGIN
  IF has_function_privilege(
    'authenticated',
    'public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'write_audit_log must not be executable by authenticated role';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMIT;
