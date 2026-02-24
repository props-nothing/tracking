-- ============================================================
-- Migration 022: Fix campaign_data duplicate rows
--
-- Problem: The UNIQUE(integration_id, campaign_id, date, ad_group_id)
-- constraint doesn't prevent duplicates when ad_group_id IS NULL,
-- because PostgreSQL treats NULL != NULL in unique constraints.
-- Every sync created new rows instead of upserting.
--
-- Fix:
-- 1. Delete duplicate rows, keeping only the most recent per group
-- 2. Set ad_group_id to '_' where it's NULL (sentinel value)
-- 3. Drop the old constraint and create a new one that works
-- 4. Set NOT NULL default so this can't happen again
-- ============================================================

-- Step 1: Delete duplicate rows, keeping only the newest (by id) per group
delete from public.campaign_data
where id not in (
  select distinct on (integration_id, campaign_id, date, coalesce(ad_group_id, '_'))
    id
  from public.campaign_data
  order by integration_id, campaign_id, date, coalesce(ad_group_id, '_'), created_at desc
);

-- Step 2: Replace NULL ad_group_id with sentinel value
update public.campaign_data
set ad_group_id = '_'
where ad_group_id is null;

-- Step 3: Set default and NOT NULL
alter table public.campaign_data
  alter column ad_group_id set default '_',
  alter column ad_group_id set not null;

-- Step 4: Drop old constraint and add new one
-- The old constraint name may vary; drop by column definition
alter table public.campaign_data
  drop constraint if exists campaign_data_integration_id_campaign_id_date_ad_group_id_key;

-- Create the proper unique constraint (now works because no NULLs)
alter table public.campaign_data
  add constraint campaign_data_unique_row
  unique (integration_id, campaign_id, date, ad_group_id);
