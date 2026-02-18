-- Add lead_data JSONB column to store ALL form fields (not just the well-known ones)
alter table public.leads add column if not exists lead_data jsonb;

comment on column public.leads.lead_data is 'All form field values as label→value pairs';
