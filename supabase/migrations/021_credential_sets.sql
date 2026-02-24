-- ============================================================
-- Migration 021: Shared Credential Sets
-- Allows users to save integration credentials once and
-- reuse them across multiple sites.
-- ============================================================

-- Named credential sets owned by a user
create table public.campaign_credential_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('google_ads', 'meta_ads', 'mailchimp')),
  name text not null,                -- e.g. "Mijn Meta Business Account"
  credentials jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.campaign_credential_sets enable row level security;

create policy "Users can manage their own credential sets"
  on public.campaign_credential_sets for all using (
    auth.uid() = user_id
  );

create index idx_credential_sets_user on public.campaign_credential_sets (user_id, provider);

-- Add optional reference from campaign_integrations to a credential set
alter table public.campaign_integrations
  add column credential_set_id uuid references public.campaign_credential_sets(id) on delete set null;

-- When credential_set_id is set, the integration uses that set's credentials
-- instead of its own credentials column. The credentials column acts as an
-- override / fallback for site-specific tweaks (e.g. different ad_account_id).
