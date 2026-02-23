BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_reports_enabled boolean NOT NULL DEFAULT true;

COMMIT;
