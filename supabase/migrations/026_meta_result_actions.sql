-- ============================================================
-- Migration 026: Configurable Meta result action types
-- Allows per-integration override of which Meta action_types
-- count as "results" (conversions). Stored as a comma-separated
-- list, e.g. "lead,offsite_conversion.fb_pixel_lead" or
-- "onsite_conversion.lead_grouped,purchase".
-- NULL = auto-detect from campaign objective (default behavior).
-- ============================================================

alter table public.campaign_integrations
  add column if not exists meta_result_actions text default null;

comment on column public.campaign_integrations.meta_result_actions is
  'Comma-separated Meta action_types that count as results/conversions. NULL = auto-detect from campaign objective. Example: "lead,offsite_conversion.fb_pixel_lead"';
