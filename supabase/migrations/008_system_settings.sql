-- ============================================================
-- System settings KV store (for daily salt rotation, etc.)
-- ============================================================
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- No RLS on system_settings — only accessible via service role
alter table public.system_settings enable row level security;

-- Seed with initial salt
insert into public.system_settings (key, value)
values ('daily_salt', gen_random_uuid()::text || '-' || extract(epoch from now())::text)
on conflict (key) do nothing;
