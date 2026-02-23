-- Phase E: prevent new plaintext Stripe secret writes.
-- Existing legacy plaintext rows remain readable for controlled backfill only.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_stripe_connection_secret_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.api_key_secret IS NOT NULL THEN
      RAISE EXCEPTION 'Plaintext api_key_secret writes are not allowed. Use api_key_secret_encrypted.';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.api_key_secret_encrypted IS NOT NULL THEN
      NEW.api_key_secret := NULL;
    END IF;

    IF NEW.api_key_secret IS NOT NULL AND NEW.api_key_secret IS DISTINCT FROM OLD.api_key_secret THEN
      RAISE EXCEPTION 'Updating plaintext api_key_secret is not allowed. Use api_key_secret_encrypted.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stripe_connections_guard_secret_storage ON public.stripe_connections;
CREATE TRIGGER on_stripe_connections_guard_secret_storage
BEFORE INSERT OR UPDATE ON public.stripe_connections
FOR EACH ROW
EXECUTE FUNCTION public.guard_stripe_connection_secret_storage();

COMMIT;
