-- ============================================================
-- INVITATIONS TABLE + get_user_by_email HELPER
-- ============================================================

-- 1. Helper: look up a user's ID by email (uses service role / security definer)
create or replace function public.get_user_by_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from auth.users where email = lower(p_email) limit 1;
$$;

-- 2. Helper: look up a user's email by ID
create or replace function public.get_email_by_user_id(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select email from auth.users where id = p_user_id limit 1;
$$;

-- 3. Site invitations table (for users who are not yet registered)
create table if not exists public.site_invitations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'viewer', 'client')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (site_id, email)
);

alter table public.site_invitations enable row level security;

-- Site owners and admins can manage invitations
create policy "Owners and admins manage invitations"
  on public.site_invitations for all using (
    site_id in (
      select s.id from public.sites s where s.user_id = auth.uid()
    )
    or
    public.is_site_admin(site_id)
  );

-- Invited users can see their own invitations (by email match)
create policy "Invited users can see own invitations"
  on public.site_invitations for select using (
    lower(email) = lower((select au.email from auth.users au where au.id = auth.uid()))
  );
