-- Deduplicate leads by email: only one lead per email per site.
-- When the same email submits again, the existing lead is updated.

-- First, clean up existing duplicates — keep the most recent per (site_id, lead_email)
delete from public.leads
where id not in (
  select distinct on (site_id, lower(lead_email)) id
  from public.leads
  where lead_email is not null
  order by site_id, lower(lead_email), created_at desc
)
and lead_email is not null
and exists (
  select 1 from public.leads l2
  where l2.site_id = leads.site_id
    and lower(l2.lead_email) = lower(leads.lead_email)
    and l2.id != leads.id
    and l2.created_at > leads.created_at
);

-- Add unique partial index on (site_id, email) — case-insensitive, only for non-null emails
create unique index idx_leads_unique_email_per_site
  on public.leads (site_id, lower(lead_email))
  where lead_email is not null;
