-- ============================================================
-- ANNOTATIONS (chart notes)
-- ============================================================
create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  date date not null,
  text text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

alter table public.annotations enable row level security;
create policy "Users can manage annotations for their own sites"
  on public.annotations for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- ALERTS
-- ============================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,
  active boolean default true,
  alert_type text not null check (alert_type in (
    'traffic_drop',
    'traffic_spike',
    'goal_not_met',
    'error_spike',
    'uptime'
  )),
  threshold jsonb not null,
  notify_email text[],
  notify_slack_webhook text,
  notify_webhook text,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;
create policy "Users can manage alerts for their own sites"
  on public.alerts for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
