-- ============================================================
-- SHARED REPORTS (client-facing)
-- ============================================================
create table public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,

  -- Access
  token text unique not null default encode(extensions.gen_random_bytes(32), 'hex'),
  password_hash text,
  expires_at timestamptz,

  -- Branding
  title text,
  description text,
  logo_url text,
  brand_color text,

  -- Content control
  template text default 'overview' check (template in (
    'overview', 'seo', 'campaign', 'ecommerce', 'custom'
  )),
  visible_sections text[] default array[
    'metrics', 'chart', 'pages', 'referrers', 'countries',
    'devices', 'utm', 'goals', 'forms'
  ],
  hidden_metrics text[] default '{}',

  -- Date range
  date_range_mode text default 'last_30_days' check (date_range_mode in (
    'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days',
    'this_month', 'last_month', 'custom', 'rolling'
  )),
  date_from date,
  date_to date,

  -- Scheduling
  email_recipients text[],
  email_schedule text check (email_schedule in ('weekly', 'monthly')),
  email_last_sent_at timestamptz,

  -- Embed
  allow_embed boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shared_reports enable row level security;
create policy "Users can manage shared reports for their own sites"
  on public.shared_reports for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
