-- Add restrictive INSERT policy for subscriptions table
-- This policy ensures NO regular user can directly insert subscriptions
-- Subscriptions should ONLY be created via the handle_new_user() trigger (which runs as SECURITY DEFINER)
-- or via service role/webhook handlers for Stripe integration

-- This policy uses a FALSE condition because:
-- 1. New user subscriptions are created by the handle_new_user() trigger with SECURITY DEFINER
-- 2. Stripe webhooks will use service_role key which bypasses RLS
-- 3. Regular authenticated users should NEVER directly insert subscription records

CREATE POLICY "Subscriptions created only by system" 
ON public.subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (false);