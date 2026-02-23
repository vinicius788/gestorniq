-- Phase C: post-launch hardening scaffolding
-- - encrypted Stripe connection secret storage
-- - baseline audit trail primitives
-- - webhook idempotency persistence

BEGIN;

ALTER TABLE public.stripe_connections
  ADD COLUMN IF NOT EXISTS api_key_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS encryption_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS sync_in_progress_at TIMESTAMPTZ;

ALTER TABLE public.stripe_connections
  ALTER COLUMN api_key_secret DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_connections_sync_status_chk'
      AND conrelid = 'public.stripe_connections'::regclass
  ) THEN
    ALTER TABLE public.stripe_connections
      ADD CONSTRAINT stripe_connections_sync_status_chk
      CHECK (sync_status IN ('idle', 'running', 'error'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS stripe_connections_sync_status_idx
  ON public.stripe_connections (sync_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon;
REVOKE ALL ON public.stripe_webhook_events FROM authenticated;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON public.stripe_webhook_events (received_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  actor_ip TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_company_id_idx
  ON public.audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx
  ON public.audit_logs (actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action TEXT,
  p_company_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_source TEXT DEFAULT 'system',
  p_actor_ip TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RAISE EXCEPTION 'p_action must be provided';
  END IF;

  INSERT INTO public.audit_logs (
    actor_user_id,
    company_id,
    action,
    source,
    actor_ip,
    metadata
  )
  VALUES (
    p_actor_user_id,
    p_company_id,
    p_action,
    COALESCE(NULLIF(trim(p_source), ''), 'system'),
    p_actor_ip,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, UUID, JSONB, TEXT, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.audit_profile_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF
    OLD.full_name IS DISTINCT FROM NEW.full_name
    OR OLD.email_notifications_enabled IS DISTINCT FROM NEW.email_notifications_enabled
    OR OLD.weekly_reports_enabled IS DISTINCT FROM NEW.weekly_reports_enabled
  THEN
    PERFORM public.write_audit_log(
      'settings.profile_updated',
      NULL,
      jsonb_build_object(
        'before', jsonb_build_object(
          'full_name', OLD.full_name,
          'email_notifications_enabled', OLD.email_notifications_enabled,
          'weekly_reports_enabled', OLD.weekly_reports_enabled
        ),
        'after', jsonb_build_object(
          'full_name', NEW.full_name,
          'email_notifications_enabled', NEW.email_notifications_enabled,
          'weekly_reports_enabled', NEW.weekly_reports_enabled
        )
      ),
      'db_trigger',
      NULL,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_audit_settings_changes ON public.profiles;
CREATE TRIGGER on_profiles_audit_settings_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_settings_changes();

CREATE OR REPLACE FUNCTION public.audit_company_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF
    OLD.name IS DISTINCT FROM NEW.name
    OR OLD.currency IS DISTINCT FROM NEW.currency
    OR OLD.data_source IS DISTINCT FROM NEW.data_source
    OR OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed
  THEN
    PERFORM public.write_audit_log(
      'settings.company_updated',
      NEW.id,
      jsonb_build_object(
        'before', jsonb_build_object(
          'name', OLD.name,
          'currency', OLD.currency,
          'data_source', OLD.data_source,
          'onboarding_completed', OLD.onboarding_completed
        ),
        'after', jsonb_build_object(
          'name', NEW.name,
          'currency', NEW.currency,
          'data_source', NEW.data_source,
          'onboarding_completed', NEW.onboarding_completed
        )
      ),
      'db_trigger',
      NULL,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_companies_audit_settings_changes ON public.companies;
CREATE TRIGGER on_companies_audit_settings_changes
AFTER UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.audit_company_settings_changes();

CREATE OR REPLACE FUNCTION public.audit_stripe_connection_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_user_id UUID;
  action_name TEXT;
  target_company_id UUID;
  payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_company_id := NEW.company_id;
    action_name := 'billing.stripe_connection_inserted';
    payload := jsonb_build_object(
      'stripe_account_id', NEW.stripe_account_id,
      'livemode', NEW.livemode,
      'status', NEW.status,
      'key_last4', NEW.key_last4
    );
  ELSIF TG_OP = 'UPDATE' THEN
    target_company_id := NEW.company_id;
    action_name := 'billing.stripe_connection_updated';
    payload := jsonb_build_object(
      'stripe_account_id', NEW.stripe_account_id,
      'livemode', NEW.livemode,
      'status', NEW.status,
      'key_last4', NEW.key_last4,
      'sync_status', NEW.sync_status
    );
  ELSE
    target_company_id := OLD.company_id;
    action_name := 'billing.stripe_connection_deleted';
    payload := jsonb_build_object(
      'stripe_account_id', OLD.stripe_account_id,
      'livemode', OLD.livemode,
      'status', OLD.status,
      'key_last4', OLD.key_last4
    );
  END IF;

  SELECT c.user_id
  INTO owner_user_id
  FROM public.companies c
  WHERE c.id = target_company_id;

  PERFORM public.write_audit_log(
    action_name,
    target_company_id,
    payload,
    'db_trigger',
    NULL,
    owner_user_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stripe_connections_audit_changes ON public.stripe_connections;
CREATE TRIGGER on_stripe_connections_audit_changes
AFTER INSERT OR UPDATE OR DELETE ON public.stripe_connections
FOR EACH ROW
EXECUTE FUNCTION public.audit_stripe_connection_changes();

COMMIT;
