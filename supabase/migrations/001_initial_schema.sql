-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ============================================================
-- SITES
-- ============================================================
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text not null unique,
  timezone text not null default 'UTC',
  -- White-label / branding
  logo_url text,
  brand_color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sites enable row level security;
create policy "Users can manage their own sites"
  on public.sites for all using (auth.uid() = user_id);

-- ============================================================
-- SITE MEMBERS (multi-user access + client access)
-- ============================================================
create table public.site_members (
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
create policy "Members can see their own memberships"
  on public.site_members for select using (auth.uid() = user_id);
create policy "Owners and admins can manage members"
  on public.site_members for all using (
    site_id in (
      select site_id from public.site_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- EVENTS (main analytics table)
-- ============================================================
create table public.events (
  id bigint generated always as identity primary key,
  site_id uuid references public.sites(id) on delete cascade not null,

  -- Event classification
  event_type text not null default 'pageview'
    check (event_type in ('pageview', 'custom', 'form_submit', 'form_abandon',
                          'outbound_click', 'file_download', 'scroll_depth',
                          'rage_click', 'dead_click', 'element_visible',
                          'copy', 'print', 'error', 'ecommerce')),
  event_name text,
  event_data jsonb default '{}',

  -- Page
  url text not null,
  path text not null,
  hostname text not null,
  page_title text,

  -- Referrer
  referrer text,
  referrer_hostname text,

  -- UTM
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,

  -- Visitor (anonymous)
  visitor_hash text not null,
  session_id uuid not null,

  -- Session-level custom properties
  custom_props jsonb default '{}',

  -- Device
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

  -- Geo (server-side via MaxMind)
  country_code char(2),
  country_name text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,

  -- Performance
  ttfb_ms int,
  fcp_ms int,
  lcp_ms int,
  cls double precision,
  inp_ms int,
  fid_ms int,

  -- Engagement
  scroll_depth_pct smallint,
  time_on_page_ms int,
  engaged_time_ms int,

  -- Form tracking
  form_id text,
  form_action text,
  form_fields jsonb,
  form_last_field text,
  form_time_to_submit_ms int,

  -- E-commerce
  ecommerce_action text check (ecommerce_action in (
    'view_item', 'add_to_cart', 'remove_from_cart',
    'begin_checkout', 'purchase', 'refund'
  )),
  order_id text,
  revenue decimal(10,2),
  currency char(3) default 'EUR',
  ecommerce_items jsonb,

  -- Error tracking
  error_message text,
  error_stack text,
  error_source text,
  error_line int,
  error_col int,

  -- Entry / exit tracking
  is_entry boolean default false,
  is_exit boolean default false,
  is_bounce boolean default false,

  -- Meta
  timestamp timestamptz default now()
);

alter table public.events enable row level security;

create policy "Users can read events for their own sites"
  on public.events for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can insert events"
  on public.events for insert with check (true);

-- Indexes
create index idx_events_site_ts on public.events (site_id, timestamp desc);
create index idx_events_site_path on public.events (site_id, path);
create index idx_events_site_type on public.events (site_id, event_type);
create index idx_events_visitor on public.events (site_id, visitor_hash, timestamp desc);
create index idx_events_session on public.events (session_id);
create index idx_events_country on public.events (site_id, country_code);
create index idx_events_referrer on public.events (site_id, referrer_hostname);
create index idx_events_form on public.events (site_id, form_id) where form_id is not null;
create index idx_events_ecommerce on public.events (site_id, ecommerce_action) where ecommerce_action is not null;
create index idx_events_event_name on public.events (site_id, event_name) where event_name is not null;
create index idx_events_entry on public.events (site_id, timestamp desc) where is_entry = true;
create index idx_events_custom_props on public.events using gin (custom_props) where custom_props != '{}';
