-- ============================================================
-- LEADS TABLE — stores form submission contact data with attribution
-- ============================================================
create table public.leads (
  id bigint generated always as identity primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  event_id bigint references public.events(id) on delete set null,
  session_id uuid not null,
  visitor_hash text not null,

  -- Lead identity (captured from form fields)
  lead_name text,
  lead_email text,
  lead_phone text,
  lead_company text,
  lead_message text,

  -- Form context
  form_id text,
  form_action text,
  page_url text,
  page_path text,

  -- Attribution (denormalized from event/session for fast queries)
  referrer text,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  entry_path text,

  -- Device & geo
  country_code char(2),
  city text,
  device_type text,
  browser text,
  os text,

  -- Status
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'archived')),
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Users can read leads for their own sites"
  on public.leads for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

create policy "Users can update leads for their own sites"
  on public.leads for update using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

create policy "Service role can insert leads"
  on public.leads for insert with check (true);

-- Indexes
create index idx_leads_site_created on public.leads (site_id, created_at desc);
create index idx_leads_site_status on public.leads (site_id, status);
create index idx_leads_site_email on public.leads (site_id, lead_email) where lead_email is not null;
create index idx_leads_site_source on public.leads (site_id, utm_source) where utm_source is not null;
create index idx_leads_session on public.leads (session_id);
create index idx_leads_visitor on public.leads (site_id, visitor_hash);

-- ============================================================
-- LEADS BY SOURCE — materialized view for dashboard aggregation
-- ============================================================
create materialized view public.leads_by_source as
select
  site_id,
  coalesce(utm_source, referrer_hostname, 'direct') as source,
  utm_medium,
  utm_campaign,
  count(*) as lead_count,
  count(distinct visitor_hash) as unique_leads,
  min(created_at) as first_lead_at,
  max(created_at) as last_lead_at
from public.leads
group by site_id, coalesce(utm_source, referrer_hostname, 'direct'), utm_medium, utm_campaign;

create unique index idx_leads_by_source on public.leads_by_source (site_id, source, utm_medium, utm_campaign);

-- Add leads refresh to the existing refresh function
create or replace function public.refresh_materialized_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_stats;
  refresh materialized view concurrently public.hourly_stats;
  refresh materialized view concurrently public.daily_goal_stats;
  refresh materialized view concurrently public.form_stats;
  refresh materialized view concurrently public.leads_by_source;
end;
$$ language plpgsql security definer;

-- ============================================================
-- LEAD STATS RPC — returns summary counts for the dashboard
-- ============================================================
create or replace function public.get_lead_stats(p_site_id uuid)
returns table (
  total_leads bigint,
  new_leads bigint,
  this_week bigint,
  this_month bigint
) as $$
begin
  return query
  select
    count(*)::bigint as total_leads,
    count(*) filter (where l.status = 'new')::bigint as new_leads,
    count(*) filter (where l.created_at >= date_trunc('week', now()))::bigint as this_week,
    count(*) filter (where l.created_at >= date_trunc('month', now()))::bigint as this_month
  from public.leads l
  where l.site_id = p_site_id;
end;
$$ language plpgsql security definer;
