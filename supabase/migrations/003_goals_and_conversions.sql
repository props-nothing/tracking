-- ============================================================
-- GOALS
-- ============================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  active boolean default true,

  goal_type text not null check (goal_type in (
    'page_visit',
    'event',
    'form_submit',
    'scroll_depth',
    'time_on_page',
    'click',
    'revenue',
    'multi_condition',
    'sequential'
  )),

  conditions jsonb not null default '[]',

  -- Value
  revenue_value decimal(10,2),
  use_dynamic_revenue boolean default false,

  -- Counting
  count_mode text default 'once_per_session' check (count_mode in ('once_per_session', 'every_time')),

  -- Notifications
  notify_webhook text,
  notify_email text[],
  notify_slack_webhook text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goals enable row level security;
create policy "Users can manage goals for their own sites"
  on public.goals for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- GOAL CONVERSIONS (log of each conversion)
-- ============================================================
create table public.goal_conversions (
  id bigint generated always as identity primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  site_id uuid references public.sites(id) on delete cascade not null,
  session_id uuid not null,
  visitor_hash text not null,
  event_id bigint references public.events(id) on delete set null,

  -- Attribution
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  entry_path text,
  conversion_path text,

  -- Value
  revenue decimal(10,2),

  converted_at timestamptz default now()
);

alter table public.goal_conversions enable row level security;
create policy "Users can read goal conversions for their own sites"
  on public.goal_conversions for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can insert conversions"
  on public.goal_conversions for insert with check (true);

create index idx_conversions_goal on public.goal_conversions (goal_id, converted_at desc);
create index idx_conversions_site on public.goal_conversions (site_id, converted_at desc);
create index idx_conversions_session on public.goal_conversions (session_id);

-- ============================================================
-- FUNNELS
-- ============================================================
create table public.funnels (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  steps jsonb not null default '[]',
  window_hours int default 168,
  created_at timestamptz default now()
);

alter table public.funnels enable row level security;
create policy "Users can manage funnels for their own sites"
  on public.funnels for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
