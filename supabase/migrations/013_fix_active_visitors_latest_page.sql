-- Fix active_visitors to show only the latest page per visitor
-- Previously it showed ALL pages visited in the last 5 minutes,
-- making it look like visitors were on multiple pages simultaneously.

create or replace view public.active_visitors as
with latest_per_visitor as (
  select distinct on (site_id, visitor_hash)
    site_id,
    visitor_hash,
    path,
    timestamp
  from public.events
  where timestamp > now() - interval '5 minutes'
    and event_type = 'pageview'
  order by site_id, visitor_hash, timestamp desc
)
select
  site_id,
  count(distinct visitor_hash) as active_count,
  jsonb_agg(distinct jsonb_build_object('path', path, 'visitor', visitor_hash)) as active_pages
from latest_per_visitor
group by site_id;
