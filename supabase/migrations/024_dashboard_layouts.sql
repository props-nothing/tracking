-- ── Dashboard Layouts ─────────────────────────────────────────
-- Stores per-user, per-site dashboard widget configurations.
-- The `widgets` JSONB column holds an ordered array of widget configs
-- that define what the overview page renders.

create table public.dashboard_layouts (
  id         uuid        primary key default gen_random_uuid(),
  site_id    uuid        not null references public.sites(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null default 'Default',
  widgets    jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, user_id, name)
);

alter table public.dashboard_layouts enable row level security;

create policy "Users can read own layouts"
  on public.dashboard_layouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own layouts"
  on public.dashboard_layouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own layouts"
  on public.dashboard_layouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own layouts"
  on public.dashboard_layouts for delete
  using (auth.uid() = user_id);
