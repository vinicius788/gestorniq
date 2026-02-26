-- Fix ensure_company_for_current_user() variable name collision with SQL current_user.
CREATE OR REPLACE FUNCTION public.ensure_company_for_current_user()
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_id UUID := auth.uid();
  company_row public.companies%ROWTYPE;
BEGIN
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO company_row
  FROM public.companies
  WHERE user_id = auth_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN company_row;
  END IF;

  INSERT INTO public.companies (
    user_id,
    name,
    currency,
    onboarding_completed,
    onboarding_completed_at,
    data_source
  )
  VALUES (
    auth_user_id,
    'My Startup',
    'USD',
    FALSE,
    NULL,
    'demo'::public.data_source_type
  )
  RETURNING * INTO company_row;

  RETURN company_row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_company_for_current_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_company_for_current_user() TO service_role;
