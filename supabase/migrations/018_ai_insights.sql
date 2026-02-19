-- ============================================================
-- Migration 018: AI Insights – config + reports tables
-- ============================================================

-- ============================================================
-- AI CONFIG (per-site AI settings)
-- ============================================================
create table public.ai_configs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null unique,
  enabled boolean default false,
  schedule text not null default 'manual' check (schedule in ('daily', 'weekly', 'manual')),
  schedule_hour smallint default 8 check (schedule_hour >= 0 and schedule_hour <= 23),
  custom_prompt text,
  included_sections text[] default array['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
  comparison_enabled boolean default true,
  comparison_period text default 'previous_period' check (comparison_period in ('previous_period', 'previous_month', 'previous_year')),
  openai_model text default 'gpt-5.2-2025-12-11',
  max_tokens int default 3000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_configs enable row level security;

create policy "Users can manage AI config for their sites"
  on public.ai_configs for all using (
    public.has_site_access(site_id)
  );

-- ============================================================
-- AI REPORTS (stored analysis results / AI memory)
-- ============================================================
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  generated_at timestamptz default now(),
  period_start date not null,
  period_end date not null,
  comparison_start date,
  comparison_end date,
  data_snapshot jsonb not null default '{}',
  prompt_used text,
  analysis jsonb not null default '{}',
  model_used text not null default 'gpt-5.2-2025-12-11',
  tokens_used int,
  cost_usd decimal(8,6),
  created_at timestamptz default now()
);

alter table public.ai_reports enable row level security;

create policy "Users can view AI reports for their sites"
  on public.ai_reports for select using (
    public.has_site_access(site_id)
  );

create policy "Service role can insert AI reports"
  on public.ai_reports for insert with check (true);

create index idx_ai_reports_site_date on public.ai_reports (site_id, generated_at desc);
create index idx_ai_reports_site_period on public.ai_reports (site_id, period_start, period_end);

-- ============================================================
-- Add show_ai_insights to shared_reports
-- ============================================================
alter table public.shared_reports add column if not exists show_ai_insights boolean default false;
