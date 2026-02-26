// ── Shared Period type ─────────────────────────────────────────
export type Period = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'custom';

// ── Filter types ──────────────────────────────────────────────
export interface Filters {
  page?: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  referrer?: string;
}

export const FILTER_KEYS: (keyof Filters)[] = ['page', 'country', 'browser', 'os', 'device', 'referrer'];

// ── Site ──────────────────────────────────────────────────────
export interface Site {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  logo_url: string | null;
  brand_color: string;
  role: string;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  public: boolean;
  allowed_origins: string[];
}

// ── Overview Stats ────────────────────────────────────────────
export interface TimeSeriesPoint {
  date: string;
  pageviews: number;
  visitors: number;
  leads?: number;
}

export interface PageStats {
  path: string;
  count: number;
  unique_visitors: number;
  avg_time: number;
  bounce_rate: number;
}

export interface OverviewStats {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  views_per_session: number;
  avg_engaged_time: number;
  total_leads: number;
  conversion_rate: number;
  avg_scroll_depth: number;
  top_page: string | null;
  top_page_count: number;
  returning_visitor_pct: number;
  returning_visitor_count: number;
  top_pages: PageStats[];
  entry_pages: { path: string; count: number }[];
  exit_pages: { path: string; count: number }[];
  top_referrers: { source: string; count: number }[];
  utm_sources: { source: string; count: number }[];
  utm_mediums: { medium: string; count: number }[];
  utm_campaigns: { campaign: string; count: number }[];
  top_countries: { country: string; count: number }[];
  top_cities: { city: string; count: number }[];
  top_browsers: { browser: string; count: number }[];
  top_os: { os: string; count: number }[];
  top_devices: { device: string; count: number }[];
  timeseries: TimeSeriesPoint[];
}

// ── Ecommerce ─────────────────────────────────────────────────
export interface EcommerceData {
  currency: string;
  total_revenue: number;
  product_revenue: number;
  total_orders: number;
  avg_order_value: number;
  add_to_cart_count: number;
  checkout_count: number;
  purchase_count: number;
  top_products: { name: string; revenue: number; quantity: number }[];
  revenue_timeseries: { date: string; revenue: number }[];
}

// ── Errors ────────────────────────────────────────────────────
export interface ErrorRow {
  error_message: string;
  error_source: string;
  error_line: number | null;
  count: number;
  last_seen: string;
}

export interface ErrorsData {
  errors: ErrorRow[];
  total_errors: number;
}

// ── Events ────────────────────────────────────────────────────
export interface EventRow {
  event_name: string;
  count: number;
  unique_visitors: number;
}

export interface RecentEvent {
  event_name: string;
  event_data: Record<string, unknown>;
  timestamp: string;
  path: string;
}

export interface EventsData {
  custom_events: EventRow[];
  recent_events: RecentEvent[];
}

// ── Web Vitals ────────────────────────────────────────────────
export interface VitalMetric {
  p50: number | null;
  p75: number | null;
}

export interface VitalsData {
  overall: {
    sample_count: number;
    ttfb: VitalMetric;
    fcp: VitalMetric;
    lcp: VitalMetric;
    cls: VitalMetric;
    inp: VitalMetric;
    fid: VitalMetric;
  };
  pages: {
    path: string;
    sample_count: number;
    lcp_p75: number | null;
    fcp_p75: number | null;
    cls_p75: number | null;
    inp_p75: number | null;
    ttfb_p75: number | null;
  }[];
  timeseries: { date: string; lcp_p75: number | null }[];
}

// ── Retention ─────────────────────────────────────────────────
export interface CohortData {
  label: string;
  total: number;
  periods: number[];
}

// ── Scroll Depth ──────────────────────────────────────────────
export interface ScrollPage {
  path: string;
  sample_count: number;
  avg_depth: number;
  pct_reached_50: number;
  pct_reached_100: number;
}

export interface ScrollData {
  avg_depth: number;
  sample_count: number;
  funnel: {
    reached_25: number;
    reached_50: number;
    reached_75: number;
    reached_100: number;
  };
  pages: ScrollPage[];
}

// ── UX Issues ─────────────────────────────────────────────────
export interface ClickElement {
  element_tag: string;
  element_text: string;
  count: number;
  unique_visitors: number;
  pages: string[];
}

export interface IssuePage {
  path: string;
  rage_clicks: number;
  dead_clicks: number;
  total: number;
}

export interface UXData {
  total_rage_clicks: number;
  total_dead_clicks: number;
  rage_click_elements: ClickElement[];
  dead_click_elements: ClickElement[];
  issue_pages: IssuePage[];
}

// ── 404s ──────────────────────────────────────────────────────
export interface NotFoundPage {
  path: string;
  hits: number;
  unique_visitors: number;
  referrers: string[];
  last_seen: string;
}

export interface Data404 {
  total_404s: number;
  unique_404_pages: number;
  pages: NotFoundPage[];
}

// ── Time on Page ──────────────────────────────────────────────
export interface PageTime {
  path: string;
  avg_time_on_page: number;
  avg_engaged_time: number;
  unique_visitors: number;
  sample_count: number;
}

export interface TimeOnPageData {
  avg_time_on_page: number;
  avg_engaged_time: number;
  sample_count: number;
  pages: PageTime[];
}

// ── Outbound & Downloads ──────────────────────────────────────
export interface OutboundLink {
  hostname: string;
  clicks: number;
  unique_visitors: number;
  top_url: string;
}

export interface DownloadFile {
  filename: string;
  downloads: number;
  unique_visitors: number;
  extension: string;
}

export interface OutboundData {
  total_outbound: number;
  total_downloads: number;
  outbound_links: OutboundLink[];
  download_files: DownloadFile[];
}

// ── Forms ─────────────────────────────────────────────────────
export interface FormData {
  form_id: string;
  submissions: number;
  abandonments: number;
  completion_rate_pct: number;
  avg_time_to_submit_ms: number;
}

export interface FormsData {
  forms: FormData[];
  abandon_fields: Record<string, Record<string, number>>;
}

// ── CRUD entities ─────────────────────────────────────────────
export interface Alert {
  id: string;
  type: 'traffic_drop' | 'traffic_spike' | 'goal_not_met' | 'error_spike' | 'uptime';
  name: string;
  threshold: number;
  notify_email: string;
  notify_slack_url: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface Annotation {
  id: string;
  text: string;
  date: string;
  created_by: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
}

export interface SharedReport {
  id: string;
  name: string;
  token: string;
  password_protected: boolean;
  show_ai_insights: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Member {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  joined_at: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  active: boolean;
  goal_conversions: { count: number }[];
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: { name: string }[];
  created_at: string;
}

// ── Leads ─────────────────────────────────────────────────────
export interface Lead {
  id: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_message: string | null;
  lead_data: Record<string, string> | null;
  form_id: string | null;
  page_path: string | null;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface LeadStats {
  total_leads: number;
  new_leads: number;
  this_week: number;
  this_month: number;
}

// ── Visitors ──────────────────────────────────────────────────
export interface Visitor {
  id: string;
  visitor_id: string;
  site_id: string;
  first_seen_at: string;
  last_seen_at: string;
  total_sessions: number;
  total_pageviews: number;
  total_events: number;
  total_revenue: number;
  total_engaged_time_ms: number;
  first_referrer_hostname: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_entry_path: string | null;
  last_referrer_hostname: string | null;
  last_utm_source: string | null;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  last_country_code: string | null;
  last_city: string | null;
  last_device_type: string | null;
  last_browser: string | null;
  last_os: string | null;
}

export interface VisitorStats {
  total_visitors: number;
  returning_visitors: number;
  new_visitors: number;
}

// ── Campaign Integrations ─────────────────────────────────────
export type CampaignProvider = 'google_ads' | 'meta_ads' | 'mailchimp';

export interface CampaignCredentialSet {
  id: string;
  user_id: string;
  provider: CampaignProvider;
  name: string;
  credentials: Record<string, string | string[] | Array<{ id: string; name: string; loginCustomerId?: string }>>;
  created_at: string;
  updated_at: string;
}

export interface CampaignIntegration {
  id: string;
  site_id: string;
  provider: CampaignProvider;
  enabled: boolean;
  credentials: Record<string, string>;
  credential_set_id: string | null;
  credential_set?: CampaignCredentialSet | null;
  campaign_filter: string | null;
  sync_frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  last_synced_at: string | null;
  last_sync_status: 'success' | 'error' | 'syncing' | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string | null;
  provider: CampaignProvider;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  avg_cpc: number;
  currency: string;
  extra_metrics: Record<string, unknown>;
}

export interface CampaignDailySummary {
  date: string;
  provider: CampaignProvider;
  active_campaigns: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  avg_cpc: number;
  cost_per_conversion: number;
  roas: number;
}

export interface CampaignOverview {
  providers: {
    provider: CampaignProvider;
    enabled: boolean;
    last_synced_at: string | null;
    last_sync_status: string | null;
  }[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    results: number;
    reach: number;
    link_clicks: number;
    ctr: number;
    avg_cpc: number;
    cost_per_conversion: number;
    cost_per_result: number;
    roas: number;
    frequency: number;
    cpm: number;
  };
  by_provider: CampaignDailySummary[];
  campaigns: CampaignRow[];
  timeseries: CampaignDailySummary[];
}

// ── Realtime ──────────────────────────────────────────────────
export interface ActiveVisitor {
  path: string;
  visitor: string;
}
