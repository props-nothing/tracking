-- ============================================================
-- SHARED DASHBOARDS (multi-site client portals, no login required)
-- ============================================================

-- Main table: each row is a shareable dashboard with its own token
create table public.shared_dashboards (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade not null,

  -- Access
  token text unique not null default encode(extensions.gen_random_bytes(32), 'hex'),
  password_hash text,
  expires_at timestamptz,

  -- Branding
  title text not null default 'Client Dashboard',
  description text,
  logo_url text,
  brand_color text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shared_dashboards enable row level security;
create policy "Owners manage their shared dashboards"
  on public.shared_dashboards for all using (created_by = auth.uid());

-- Join table: which sites are included in a shared dashboard
-- Each site gets its own shared_report that will be used as the detail view
create table public.shared_dashboard_sites (
  id uuid primary key default gen_random_uuid(),
  shared_dashboard_id uuid references public.shared_dashboards(id) on delete cascade not null,
  site_id uuid references public.sites(id) on delete cascade not null,
  -- The shared report token to link through to (auto-created if null)
  report_token text,
  display_order int default 0,
  unique (shared_dashboard_id, site_id)
);

alter table public.shared_dashboard_sites enable row level security;
create policy "Owners manage their shared dashboard sites"
  on public.shared_dashboard_sites for all using (
    shared_dashboard_id in (
      select id from public.shared_dashboards where created_by = auth.uid()
    )
  );
