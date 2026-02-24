-- ============================================================
-- Migration 023: Campaign name filter per integration
-- Allows filtering campaigns by keyword (e.g. site name) so 
-- shared ad accounts only show relevant campaigns per site.
-- ============================================================

-- Add campaign_filter column (case-insensitive keyword match on campaign_name)
-- NULL or empty = no filter (show all campaigns)
-- e.g. 'polderkroon' → only sync/show campaigns whose name contains 'polderkroon'
alter table public.campaign_integrations
  add column if not exists campaign_filter text default null;

-- Add comment for documentation
comment on column public.campaign_integrations.campaign_filter is
  'Optional keyword filter: only campaigns whose name contains this text (case-insensitive) are synced and displayed. NULL = no filter.';
