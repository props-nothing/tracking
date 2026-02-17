-- ============================================================
-- FIX INFINITE RECURSION IN site_members RLS POLICIES
-- ============================================================
-- The "Owners and admins can manage members" policy on site_members
-- queries site_members itself, causing infinite recursion.
-- All other tables that reference site_members in their policies
-- also trigger this recursion.
--
-- Fix: create SECURITY DEFINER helper functions that bypass RLS
-- for membership checks, then replace all affected policies.
-- ============================================================

-- Helper: check if current user owns a site or is a member (any role)
create or replace function public.has_site_access(p_site_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.sites where id = p_site_id and user_id = auth.uid()
  )
  or exists (
    select 1 from public.site_members where site_id = p_site_id and user_id = auth.uid()
  );
$$;

-- Helper: check if current user is owner or admin of a site
create or replace function public.is_site_admin(p_site_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.sites where id = p_site_id and user_id = auth.uid()
  )
  or exists (
    select 1 from public.site_members
    where site_id = p_site_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ============================================================
-- 1. Fix site_members policies (the root cause)
-- ============================================================
drop policy if exists "Owners and admins can manage members" on public.site_members;
create policy "Owners and admins can manage members"
  on public.site_members for all using (
    public.is_site_admin(site_id)
  );

-- ============================================================
-- 2. Fix events policy
-- ============================================================
drop policy if exists "Users can read events for their own sites" on public.events;
create policy "Users can read events for their own sites"
  on public.events for select using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- 3. Fix shared_reports policy
-- ============================================================
drop policy if exists "Users can manage shared reports for their own sites" on public.shared_reports;
create policy "Users can manage shared reports for their own sites"
  on public.shared_reports for all using (
    public.is_site_admin(site_id)
  );

-- ============================================================
-- 4. Fix sessions policy
-- ============================================================
drop policy if exists "Users can read sessions for their own sites" on public.sessions;
create policy "Users can read sessions for their own sites"
  on public.sessions for select using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- 5. Fix goals policy
-- ============================================================
drop policy if exists "Users can manage goals for their own sites" on public.goals;
create policy "Users can manage goals for their own sites"
  on public.goals for all using (
    public.is_site_admin(site_id)
  );

-- ============================================================
-- 6. Fix goal_conversions policy
-- ============================================================
drop policy if exists "Users can read goal conversions for their own sites" on public.goal_conversions;
create policy "Users can read goal conversions for their own sites"
  on public.goal_conversions for select using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- 7. Fix funnels policy
-- ============================================================
drop policy if exists "Users can manage funnels for their own sites" on public.funnels;
create policy "Users can manage funnels for their own sites"
  on public.funnels for all using (
    public.is_site_admin(site_id)
  );

-- ============================================================
-- 8. Fix api_keys policy
-- ============================================================
drop policy if exists "Users can manage API keys for their own sites" on public.api_keys;
create policy "Users can manage API keys for their own sites"
  on public.api_keys for all using (
    public.is_site_admin(site_id)
  );

-- ============================================================
-- 9. Fix annotations policy
-- ============================================================
drop policy if exists "Users can manage annotations for their own sites" on public.annotations;
create policy "Users can manage annotations for their own sites"
  on public.annotations for all using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- 10. Fix alerts policy
-- ============================================================
drop policy if exists "Users can manage alerts for their own sites" on public.alerts;
create policy "Users can manage alerts for their own sites"
  on public.alerts for all using (
    public.is_site_admin(site_id)
  );
