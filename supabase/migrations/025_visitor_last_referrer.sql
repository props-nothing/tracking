-- ============================================================
-- Add last-touch referrer/attribution columns to visitors
-- Fixes: visitors page showing "Direct" for visitors whose
-- first visit was direct but later returned via Google/other.
-- ============================================================

-- Add last-touch attribution columns
ALTER TABLE public.visitors ADD COLUMN last_referrer_hostname text;
ALTER TABLE public.visitors ADD COLUMN last_utm_source text;
ALTER TABLE public.visitors ADD COLUMN last_utm_medium text;
ALTER TABLE public.visitors ADD COLUMN last_utm_campaign text;

-- Backfill: set last_referrer_hostname from first_referrer_hostname where available
UPDATE public.visitors
  SET last_referrer_hostname = first_referrer_hostname,
      last_utm_source = first_utm_source,
      last_utm_medium = first_utm_medium,
      last_utm_campaign = first_utm_campaign
  WHERE first_referrer_hostname IS NOT NULL
     OR first_utm_source IS NOT NULL;
