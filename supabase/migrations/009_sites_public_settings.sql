-- ============================================================
-- ADD PUBLIC DASHBOARD & ALLOWED ORIGINS TO SITES
-- ============================================================
alter table public.sites
  add column if not exists public boolean not null default false,
  add column if not exists allowed_origins text[] default '{}';
