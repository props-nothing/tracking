-- ============================================================
-- VISITOR PROFILES — persistent cross-session visitor tracking
-- ============================================================

-- 1. Add visitor_id columns to events and sessions
ALTER TABLE public.events ADD COLUMN visitor_id uuid;
ALTER TABLE public.sessions ADD COLUMN visitor_id uuid;

-- 2. Create visitors aggregate table
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  visitor_id uuid NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  total_sessions int DEFAULT 1,
  total_pageviews int DEFAULT 0,
  total_events int DEFAULT 0,
  total_revenue decimal(10,2) DEFAULT 0,
  total_engaged_time_ms int DEFAULT 0,
  -- First-touch attribution
  first_referrer_hostname text,
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_entry_path text,
  -- Last-known device/location info
  last_country_code char(2),
  last_city text,
  last_device_type text,
  last_browser text,
  last_os text,
  last_language text,
  last_screen_width int,
  last_screen_height int,
  -- Custom properties merged across sessions
  custom_props jsonb DEFAULT '{}',
  UNIQUE(site_id, visitor_id)
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visitors for their own sites"
  ON public.visitors FOR SELECT USING (
    site_id IN (
      SELECT site_id FROM public.site_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage visitors"
  ON public.visitors FOR ALL WITH CHECK (true);

-- Indexes
CREATE INDEX idx_visitors_site_last_seen ON public.visitors (site_id, last_seen_at DESC);
CREATE INDEX idx_visitors_site_first_seen ON public.visitors (site_id, first_seen_at DESC);
CREATE INDEX idx_visitors_site_visitor_id ON public.visitors (site_id, visitor_id);
CREATE INDEX idx_visitors_site_sessions ON public.visitors (site_id, total_sessions DESC);
CREATE INDEX idx_visitors_site_revenue ON public.visitors (site_id, total_revenue DESC) WHERE total_revenue > 0;

-- Index on events for visitor_id lookups
CREATE INDEX idx_events_visitor_id ON public.events (site_id, visitor_id, timestamp DESC) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_sessions_visitor_id ON public.sessions (site_id, visitor_id) WHERE visitor_id IS NOT NULL;
