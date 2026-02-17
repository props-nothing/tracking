-- ============================================================
-- API KEYS (for programmatic client access)
-- ============================================================
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  permissions text[] default array['read'],
  scoped_to_site boolean default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.api_keys enable row level security;
create policy "Users can manage API keys for their own sites"
  on public.api_keys for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
