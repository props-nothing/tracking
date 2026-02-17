-- ============================================================
-- IDEMPOTENT MIGRATION — safe to re-run
-- ============================================================

-- EXTENSIONS
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ============================================================
-- SITES
-- ============================================================
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text not null unique,
  timezone text not null default 'UTC',
  logo_url text,
  brand_color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.sites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sites' and policyname = 'Users can manage their own sites') then
    create policy "Users can manage their own sites" on public.sites for all using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- SITE MEMBERS
-- ============================================================
create table if not exists public.site_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'viewer', 'client')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (site_id, user_id)
);
alter table public.site_members enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'site_members' and policyname = 'Members can see their own memberships') then
    create policy "Members can see their own memberships" on public.site_members for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'site_members' and policyname = 'Owners and admins can manage members') then
    create policy "Owners and admins can manage members" on public.site_members for all using (
      site_id in (select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin'))
    );
  end if;
end $$;

-- ============================================================
-- EVENTS
-- ============================================================
create table if not exists public.events (
  id bigint generated always as identity primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  event_type text not null default 'pageview'
    check (event_type in ('pageview', 'custom', 'form_submit', 'form_abandon',
                          'outbound_click', 'file_download', 'scroll_depth',
                          'rage_click', 'dead_click', 'element_visible',
                          'copy', 'print', 'error', 'ecommerce')),
  event_name text,
  event_data jsonb default '{}',
  url text not null,
  path text not null,
  hostname text not null,
  page_title text,
  referrer text,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  visitor_hash text not null,
  session_id uuid not null,
  custom_props jsonb default '{}',
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_type text check (device_type in ('desktop', 'mobile', 'tablet')),
  screen_width int,
  screen_height int,
  viewport_width int,
  viewport_height int,
  language text,
  timezone text,
  connection_type text,
  country_code char(2),
  country_name text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  ttfb_ms int,
  fcp_ms int,
  lcp_ms int,
  cls double precision,
  inp_ms int,
  fid_ms int,
  scroll_depth_pct smallint,
  time_on_page_ms int,
  engaged_time_ms int,
  form_id text,
  form_action text,
  form_fields jsonb,
  form_last_field text,
  form_time_to_submit_ms int,
  ecommerce_action text check (ecommerce_action in (
    'view_item', 'add_to_cart', 'remove_from_cart',
    'begin_checkout', 'purchase', 'refund'
  )),
  order_id text,
  revenue decimal(10,2),
  currency char(3) default 'EUR',
  ecommerce_items jsonb,
  error_message text,
  error_stack text,
  error_source text,
  error_line int,
  error_col int,
  is_entry boolean default false,
  is_exit boolean default false,
  is_bounce boolean default false,
  timestamp timestamptz default now()
);
alter table public.events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Users can read events for their own sites') then
    create policy "Users can read events for their own sites" on public.events for select using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid()
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Service role can insert events') then
    create policy "Service role can insert events" on public.events for insert with check (true);
  end if;
end $$;

create index if not exists idx_events_site_ts on public.events (site_id, timestamp desc);
create index if not exists idx_events_site_path on public.events (site_id, path);
create index if not exists idx_events_site_type on public.events (site_id, event_type);
create index if not exists idx_events_visitor on public.events (site_id, visitor_hash, timestamp desc);
create index if not exists idx_events_session on public.events (session_id);
create index if not exists idx_events_country on public.events (site_id, country_code);
create index if not exists idx_events_referrer on public.events (site_id, referrer_hostname);
create index if not exists idx_events_form on public.events (site_id, form_id) where form_id is not null;
create index if not exists idx_events_ecommerce on public.events (site_id, ecommerce_action) where ecommerce_action is not null;
create index if not exists idx_events_event_name on public.events (site_id, event_name) where event_name is not null;
create index if not exists idx_events_entry on public.events (site_id, timestamp desc) where is_entry = true;
create index if not exists idx_events_custom_props on public.events using gin (custom_props) where custom_props != '{}';

-- ============================================================
-- SESSIONS
-- ============================================================
create table if not exists public.sessions (
  id uuid primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  visitor_hash text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_ms int,
  engaged_time_ms int,
  pageviews int default 1,
  events_count int default 1,
  is_bounce boolean default true,
  entry_path text,
  exit_path text,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country_code char(2),
  city text,
  device_type text,
  browser text,
  os text,
  total_revenue decimal(10,2) default 0,
  custom_props jsonb default '{}'
);
alter table public.sessions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sessions' and policyname = 'Users can read sessions for their own sites') then
    create policy "Users can read sessions for their own sites" on public.sessions for select using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid()
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sessions' and policyname = 'Service role can manage sessions') then
    create policy "Service role can manage sessions" on public.sessions for all with check (true);
  end if;
end $$;

create index if not exists idx_sessions_site_started on public.sessions (site_id, started_at desc);
create index if not exists idx_sessions_visitor on public.sessions (site_id, visitor_hash);
create index if not exists idx_sessions_bounce on public.sessions (site_id, is_bounce) where is_bounce = true;
create index if not exists idx_sessions_revenue on public.sessions (site_id, total_revenue) where total_revenue > 0;

-- ============================================================
-- GOALS
-- ============================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  active boolean default true,
  goal_type text not null check (goal_type in (
    'page_visit', 'event', 'form_submit', 'scroll_depth',
    'time_on_page', 'click', 'revenue', 'multi_condition', 'sequential'
  )),
  conditions jsonb not null default '[]',
  revenue_value decimal(10,2),
  use_dynamic_revenue boolean default false,
  count_mode text default 'once_per_session' check (count_mode in ('once_per_session', 'every_time')),
  notify_webhook text,
  notify_email text[],
  notify_slack_webhook text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.goals enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'goals' and policyname = 'Users can manage goals for their own sites') then
    create policy "Users can manage goals for their own sites" on public.goals for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- GOAL CONVERSIONS
-- ============================================================
create table if not exists public.goal_conversions (
  id bigint generated always as identity primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  site_id uuid references public.sites(id) on delete cascade not null,
  session_id uuid not null,
  visitor_hash text not null,
  event_id bigint references public.events(id) on delete set null,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  entry_path text,
  conversion_path text,
  revenue decimal(10,2),
  converted_at timestamptz default now()
);
alter table public.goal_conversions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'goal_conversions' and policyname = 'Users can read goal conversions for their own sites') then
    create policy "Users can read goal conversions for their own sites" on public.goal_conversions for select using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid()
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'goal_conversions' and policyname = 'Service role can insert conversions') then
    create policy "Service role can insert conversions" on public.goal_conversions for insert with check (true);
  end if;
end $$;

create index if not exists idx_conversions_goal on public.goal_conversions (goal_id, converted_at desc);
create index if not exists idx_conversions_site on public.goal_conversions (site_id, converted_at desc);
create index if not exists idx_conversions_session on public.goal_conversions (session_id);

-- ============================================================
-- FUNNELS
-- ============================================================
create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  steps jsonb not null default '[]',
  window_hours int default 168,
  created_at timestamptz default now()
);
alter table public.funnels enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'funnels' and policyname = 'Users can manage funnels for their own sites') then
    create policy "Users can manage funnels for their own sites" on public.funnels for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- SHARED REPORTS
-- ============================================================
create table if not exists public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  token text unique not null default encode(extensions.gen_random_bytes(32), 'hex'),
  password_hash text,
  expires_at timestamptz,
  title text,
  description text,
  logo_url text,
  brand_color text,
  template text default 'overview' check (template in (
    'overview', 'seo', 'campaign', 'ecommerce', 'custom'
  )),
  visible_sections text[] default array[
    'metrics', 'chart', 'pages', 'referrers', 'countries',
    'devices', 'utm', 'goals', 'forms'
  ],
  hidden_metrics text[] default '{}',
  date_range_mode text default 'last_30_days' check (date_range_mode in (
    'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days',
    'this_month', 'last_month', 'custom', 'rolling'
  )),
  date_from date,
  date_to date,
  email_recipients text[],
  email_schedule text check (email_schedule in ('weekly', 'monthly')),
  email_last_sent_at timestamptz,
  allow_embed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.shared_reports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'shared_reports' and policyname = 'Users can manage shared reports for their own sites') then
    create policy "Users can manage shared reports for their own sites" on public.shared_reports for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- API KEYS
-- ============================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  permissions text[] default array['read'],
  scoped_to_site boolean default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.api_keys enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'api_keys' and policyname = 'Users can manage API keys for their own sites') then
    create policy "Users can manage API keys for their own sites" on public.api_keys for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- ANNOTATIONS
-- ============================================================
create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  date date not null,
  text text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);
alter table public.annotations enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'annotations' and policyname = 'Users can manage annotations for their own sites') then
    create policy "Users can manage annotations for their own sites" on public.annotations for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid()
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- ALERTS
-- ============================================================
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,
  active boolean default true,
  alert_type text not null check (alert_type in (
    'traffic_drop', 'traffic_spike', 'goal_not_met', 'error_spike', 'uptime'
  )),
  threshold jsonb not null,
  notify_email text[],
  notify_slack_webhook text,
  notify_webhook text,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);
alter table public.alerts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'Users can manage alerts for their own sites') then
    create policy "Users can manage alerts for their own sites" on public.alerts for all using (
      site_id in (
        select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
        union
        select id from public.sites where user_id = auth.uid()
      )
    );
  end if;
end $$;

-- ============================================================
-- VIEWS & MATERIALIZED VIEWS
-- ============================================================

-- Active visitors (regular view — always up to date)
create or replace view public.active_visitors as
select
  site_id,
  count(distinct visitor_hash) as active_count,
  jsonb_agg(distinct jsonb_build_object('path', path, 'visitor', visitor_hash)) as active_pages
from public.events
where timestamp > now() - interval '5 minutes'
  and event_type = 'pageview'
group by site_id;

-- Drop and recreate materialized views (safe for re-run)
drop materialized view if exists public.daily_stats cascade;
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

drop materialized view if exists public.hourly_stats cascade;
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

drop materialized view if exists public.daily_goal_stats cascade;
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

drop materialized view if exists public.form_stats cascade;
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

-- Refresh function
create or replace function public.refresh_materialized_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_stats;
  refresh materialized view concurrently public.hourly_stats;
  refresh materialized view concurrently public.daily_goal_stats;
  refresh materialized view concurrently public.form_stats;
end;
$$ language plpgsql security definer;

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.system_settings enable row level security;

insert into public.system_settings (key, value)
values ('daily_salt', gen_random_uuid()::text || '-' || extract(epoch from now())::text)
on conflict (key) do nothing;

-- ============================================================
-- GRANTS — ensure authenticated & anon roles can access tables
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.sites to authenticated;
grant select, insert, update, delete on public.site_members to authenticated;
grant select on public.events to authenticated;
grant insert on public.events to anon;
grant select on public.sessions to authenticated;
grant insert, update on public.sessions to anon;
grant select, insert, update, delete on public.goals to authenticated;
grant select on public.goal_conversions to authenticated;
grant insert on public.goal_conversions to anon;
grant select, insert, update, delete on public.funnels to authenticated;
grant select, insert, update, delete on public.shared_reports to authenticated;
grant select, insert, update, delete on public.api_keys to authenticated;
grant select, insert, update, delete on public.annotations to authenticated;
grant select, insert, update, delete on public.alerts to authenticated;
grant select on public.system_settings to authenticated, anon;
grant select on public.active_visitors to authenticated, anon;
grant select on public.daily_stats to authenticated;
grant select on public.hourly_stats to authenticated;
grant select on public.daily_goal_stats to authenticated;
grant select on public.form_stats to authenticated;

-- ============================================================
-- RELOAD PostgREST SCHEMA CACHE
-- (makes new tables/views available via the REST API immediately)
-- ============================================================
notify pgrst, 'reload schema';
