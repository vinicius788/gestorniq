-- Stripe revenue integration: persist per-company API keys and sync metadata.
-- Access is restricted to trusted server contexts (service_role via Edge Functions).

BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  api_key_secret TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  livemode BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_connections ENABLE ROW LEVEL SECURITY;

-- Explicitly block direct client access. Edge Functions use service_role and bypass RLS.
REVOKE ALL ON public.stripe_connections FROM anon;
REVOKE ALL ON public.stripe_connections FROM authenticated;

DROP TRIGGER IF EXISTS update_stripe_connections_updated_at ON public.stripe_connections;
CREATE TRIGGER update_stripe_connections_updated_at
  BEFORE UPDATE ON public.stripe_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
