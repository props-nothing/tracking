-- ============================================================
-- Migration 017: Fixes + new materialized views for dashboards
-- ============================================================

-- 1. Clean up self-referrals in existing data
UPDATE public.events e
SET referrer_hostname = NULL, referrer = NULL
FROM public.sites s
WHERE e.site_id = s.id
  AND e.referrer_hostname = s.domain;

UPDATE public.sessions s
SET referrer_hostname = NULL
FROM public.sites si
WHERE s.site_id = si.id
  AND s.referrer_hostname = si.domain;

UPDATE public.leads l
SET referrer_hostname = NULL, referrer = NULL
FROM public.sites s
WHERE l.site_id = s.id
  AND l.referrer_hostname = s.domain;

-- 2. Fix is_exit: mark the last event of each session as is_exit = true
-- First reset all
UPDATE public.events SET is_exit = false WHERE is_exit = true;
-- Then set the latest event per session
UPDATE public.events e
SET is_exit = true
FROM (
  SELECT DISTINCT ON (session_id) id
  FROM public.events
  ORDER BY session_id, timestamp DESC
) latest
WHERE e.id = latest.id;

-- 3. Create materialized view: daily web vitals aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_vitals AS
SELECT
  site_id,
  date_trunc('day', timestamp)::date AS day,
  path,
  count(*) FILTER (WHERE ttfb_ms IS NOT NULL) AS sample_count,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ttfb_ms) FILTER (WHERE ttfb_ms IS NOT NULL) AS ttfb_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY ttfb_ms) FILTER (WHERE ttfb_ms IS NOT NULL) AS ttfb_p75,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fcp_ms) FILTER (WHERE fcp_ms IS NOT NULL) AS fcp_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY fcp_ms) FILTER (WHERE fcp_ms IS NOT NULL) AS fcp_p75,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY lcp_ms) FILTER (WHERE lcp_ms IS NOT NULL) AS lcp_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_ms) FILTER (WHERE lcp_ms IS NOT NULL) AS lcp_p75,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY cls) FILTER (WHERE cls IS NOT NULL) AS cls_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY cls) FILTER (WHERE cls IS NOT NULL) AS cls_p75,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY inp_ms) FILTER (WHERE inp_ms IS NOT NULL) AS inp_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY inp_ms) FILTER (WHERE inp_ms IS NOT NULL) AS inp_p75,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fid_ms) FILTER (WHERE fid_ms IS NOT NULL) AS fid_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY fid_ms) FILTER (WHERE fid_ms IS NOT NULL) AS fid_p75
FROM public.events
WHERE event_type = 'pageview'
  AND (ttfb_ms IS NOT NULL OR fcp_ms IS NOT NULL OR lcp_ms IS NOT NULL OR cls IS NOT NULL OR inp_ms IS NOT NULL)
GROUP BY site_id, day, path;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_vitals_pk ON public.daily_vitals (site_id, day, path);

-- 4. Create materialized view: daily scroll depth aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_scroll_depth AS
SELECT
  site_id,
  date_trunc('day', timestamp)::date AS day,
  path,
  count(*) AS sample_count,
  round(avg(scroll_depth_pct)) AS avg_scroll_depth,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY scroll_depth_pct) AS scroll_p50,
  count(*) FILTER (WHERE scroll_depth_pct >= 25) AS reached_25,
  count(*) FILTER (WHERE scroll_depth_pct >= 50) AS reached_50,
  count(*) FILTER (WHERE scroll_depth_pct >= 75) AS reached_75,
  count(*) FILTER (WHERE scroll_depth_pct = 100) AS reached_100
FROM public.events
WHERE event_type = 'pageview'
  AND scroll_depth_pct IS NOT NULL
GROUP BY site_id, day, path;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_scroll_pk ON public.daily_scroll_depth (site_id, day, path);

-- 5. Create materialized view: daily time on page aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_time_on_page AS
SELECT
  site_id,
  date_trunc('day', timestamp)::date AS day,
  path,
  count(*) AS sample_count,
  round(avg(time_on_page_ms)) AS avg_time_on_page,
  round(avg(engaged_time_ms)) AS avg_engaged_time,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY time_on_page_ms) FILTER (WHERE time_on_page_ms IS NOT NULL) AS time_p50,
  max(time_on_page_ms) AS max_time_on_page
FROM public.events
WHERE event_type = 'pageview'
  AND (time_on_page_ms IS NOT NULL OR engaged_time_ms IS NOT NULL)
GROUP BY site_id, day, path;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_time_pk ON public.daily_time_on_page (site_id, day, path);

-- 6. Add refresh for new materialized views to the cron (manual via Supabase dashboard)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_vitals;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_scroll_depth;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_time_on_page;
