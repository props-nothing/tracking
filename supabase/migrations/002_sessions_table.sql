-- ============================================================
-- SESSIONS (aggregated per session for fast queries)
-- ============================================================
create table public.sessions (
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
create policy "Users can read sessions for their own sites"
  on public.sessions for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can manage sessions"
  on public.sessions for all with check (true);

create index idx_sessions_site_started on public.sessions (site_id, started_at desc);
create index idx_sessions_visitor on public.sessions (site_id, visitor_hash);
create index idx_sessions_bounce on public.sessions (site_id, is_bounce) where is_bounce = true;
create index idx_sessions_revenue on public.sessions (site_id, total_revenue) where total_revenue > 0;
