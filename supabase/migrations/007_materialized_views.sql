-- ============================================================
-- MATERIALIZED VIEWS
-- ============================================================

-- Active visitors (last 5 minutes)
create or replace view public.active_visitors as
select
  site_id,
  count(distinct visitor_hash) as active_count,
  jsonb_agg(distinct jsonb_build_object('path', path, 'visitor', visitor_hash)) as active_pages
from public.events
where timestamp > now() - interval '5 minutes'
  and event_type = 'pageview'
group by site_id;

-- Daily stats (materialized, refreshed by cron)
create materialized view public.daily_stats as
select
  site_id,
  date_trunc('day', timestamp)::date as day,
  count(*) filter (where event_type = 'pageview') as pageviews,
  count(distinct visitor_hash) as unique_visitors,
  count(distinct session_id) as sessions,
  count(distinct path) as unique_pages,
  count(*) filter (where event_type = 'form_submit') as form_submissions,
  sum(revenue) filter (where revenue is not null) as total_revenue,
  avg(engaged_time_ms) filter (where engaged_time_ms is not null) as avg_engaged_time_ms
from public.events
group by site_id, date_trunc('day', timestamp)::date;

create unique index idx_daily_stats_site_day on public.daily_stats (site_id, day);

-- Hourly stats (for real-time "today" view)
create materialized view public.hourly_stats as
select
  site_id,
  date_trunc('hour', timestamp) as hour,
  count(*) filter (where event_type = 'pageview') as pageviews,
  count(distinct visitor_hash) as unique_visitors,
  count(distinct session_id) as sessions
from public.events
where timestamp > now() - interval '48 hours'
group by site_id, date_trunc('hour', timestamp);

create unique index idx_hourly_stats_site_hour on public.hourly_stats (site_id, hour);

-- Goal conversion daily summary
create materialized view public.daily_goal_stats as
select
  gc.goal_id,
  gc.site_id,
  date_trunc('day', gc.converted_at)::date as day,
  count(*) as conversions,
  count(distinct gc.visitor_hash) as unique_converters,
  sum(gc.revenue) as revenue
from public.goal_conversions gc
group by gc.goal_id, gc.site_id, date_trunc('day', gc.converted_at)::date;

create unique index idx_daily_goal_stats on public.daily_goal_stats (goal_id, site_id, day);

-- Form analytics summary
create materialized view public.form_stats as
select
  site_id,
  form_id,
  count(*) filter (where event_type = 'form_submit') as submissions,
  count(*) filter (where event_type = 'form_abandon') as abandonments,
  round(
    count(*) filter (where event_type = 'form_submit')::decimal /
    nullif(count(*) filter (where event_type in ('form_submit', 'form_abandon')), 0) * 100,
    1
  ) as completion_rate_pct,
  avg(form_time_to_submit_ms) filter (where event_type = 'form_submit') as avg_time_to_submit_ms,
  mode() within group (order by form_last_field) filter (where event_type = 'form_abandon') as most_common_abandon_field
from public.events
where form_id is not null
group by site_id, form_id;

create unique index idx_form_stats on public.form_stats (site_id, form_id);

-- Refresh function (called by cron)
create or replace function public.refresh_materialized_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_stats;
  refresh materialized view concurrently public.hourly_stats;
  refresh materialized view concurrently public.daily_goal_stats;
  refresh materialized view concurrently public.form_stats;
end;
$$ language plpgsql security definer;
