-- ============================================================
-- Migration 020: Campaign Integrations – Google Ads, Meta Ads, Mailchimp
-- Per-site configurable campaign data from external platforms
-- ============================================================

-- ============================================================
-- CAMPAIGN INTEGRATIONS (per-site credentials/config)
-- ============================================================
create table public.campaign_integrations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  provider text not null check (provider in ('google_ads', 'meta_ads', 'mailchimp')),
  enabled boolean default false,

  -- Encrypted credentials stored as JSONB
  -- Google Ads:  { client_id, client_secret, refresh_token, customer_id, login_customer_id? }
  -- Meta Ads:    { access_token, ad_account_id, app_id?, app_secret? }
  -- Mailchimp:   { api_key, server_prefix, list_id? }
  credentials jsonb not null default '{}',

  -- Sync settings
  sync_frequency text not null default 'daily' check (sync_frequency in ('hourly', 'daily', 'weekly', 'manual')),
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'error', 'syncing')),
  last_sync_error text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- One integration per provider per site
  unique(site_id, provider)
);

alter table public.campaign_integrations enable row level security;

create policy "Users can manage campaign integrations for their sites"
  on public.campaign_integrations for all using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- CAMPAIGN DATA (cached/synced campaign metrics)
-- ============================================================
create table public.campaign_data (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  integration_id uuid references public.campaign_integrations(id) on delete cascade not null,
  provider text not null check (provider in ('google_ads', 'meta_ads', 'mailchimp')),

  -- Campaign identification
  campaign_id text not null,        -- External campaign ID
  campaign_name text not null,
  campaign_status text,             -- active, paused, ended, etc.

  -- Ad group / ad set level (optional)
  ad_group_id text,
  ad_group_name text,

  -- Date for this data row
  date date not null,

  -- Common metrics across all providers
  impressions bigint default 0,
  clicks bigint default 0,
  cost decimal(12,2) default 0,     -- In account currency
  conversions decimal(12,2) default 0,
  conversion_value decimal(12,2) default 0,

  -- Provider-specific metrics as JSONB
  -- Google Ads:  { ctr, avg_cpc, search_impression_share, quality_score, ... }
  -- Meta Ads:    { reach, frequency, cpm, cpc, cpp, actions, ... }
  -- Mailchimp:   { sends, opens, unique_opens, open_rate, click_rate, unsubscribes, bounces, ... }
  extra_metrics jsonb default '{}',

  -- Currency
  currency text default 'EUR',

  created_at timestamptz default now(),

  -- Prevent duplicate rows
  unique(integration_id, campaign_id, date, ad_group_id)
);

alter table public.campaign_data enable row level security;

create policy "Users can view campaign data for their sites"
  on public.campaign_data for select using (
    public.has_site_access(site_id)
  );

create policy "Service role can manage campaign data"
  on public.campaign_data for insert with check (true);

create policy "Service role can update campaign data"
  on public.campaign_data for update using (true);

create policy "Service role can delete campaign data"
  on public.campaign_data for delete using (
    public.has_site_access(site_id)
  );

-- Indexes for efficient querying
create index idx_campaign_data_site_date on public.campaign_data (site_id, date desc);
create index idx_campaign_data_integration on public.campaign_data (integration_id, date desc);
create index idx_campaign_data_provider on public.campaign_data (site_id, provider, date desc);
create index idx_campaign_data_campaign on public.campaign_data (site_id, campaign_id, date desc);
create index idx_campaign_integrations_site on public.campaign_integrations (site_id);

-- ============================================================
-- Aggregated view for quick dashboard queries
-- ============================================================
create or replace view public.campaign_daily_summary as
select
  site_id,
  provider,
  date,
  count(distinct campaign_id) as active_campaigns,
  sum(impressions) as impressions,
  sum(clicks) as clicks,
  sum(cost) as cost,
  sum(conversions) as conversions,
  sum(conversion_value) as conversion_value,
  case when sum(impressions) > 0
    then round((sum(clicks)::numeric / sum(impressions)::numeric) * 100, 2)
    else 0
  end as ctr,
  case when sum(clicks) > 0
    then round(sum(cost)::numeric / sum(clicks)::numeric, 2)
    else 0
  end as avg_cpc,
  case when sum(conversions) > 0
    then round(sum(cost)::numeric / sum(conversions)::numeric, 2)
    else 0
  end as cost_per_conversion,
  case when sum(cost) > 0
    then round((sum(conversion_value)::numeric / sum(cost)::numeric), 2)
    else 0
  end as roas
from public.campaign_data
group by site_id, provider, date;
