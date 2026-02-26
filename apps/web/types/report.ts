export interface NameValue {
  name: string;
  value: number;
}

export interface NameVisitors {
  name: string;
  visitors: number;
}

export interface PathViews {
  path: string;
  views: number;
}

export interface SourceVisitors {
  source: string;
  visitors: number;
}

export interface CountryRow {
  code: string;
  name: string;
  visitors: number;
}

export interface LeadRow {
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
  created_at: string;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface CampaignRow {
  provider: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  results: number;
  currency: string;
}

export interface ProviderSummary {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  results: number;
}

export interface AIAnalysisData {
  summary: string;
  highlights: {
    type: string;
    title: string;
    detail: string;
    metric?: string;
    change_pct?: number;
  }[];
  lead_insights: {
    top_sources: string;
    recommendations: string[];
    quality_assessment: string;
  };
  campaign_insights: {
    best_performing: string;
    worst_performing: string;
    budget_recommendations: string[];
    new_ideas: string[];
  };
  traffic_insights: {
    trends: string;
    anomalies: string[];
    opportunities: string[];
  };
  page_insights: {
    top_performers: string;
    underperformers: string;
    optimization_suggestions: string[];
  };
  comparison?: {
    summary: string;
    improvements: string[];
    regressions: string[];
    campaign_comparison: string;
  };
  action_items: {
    priority: string;
    category: string;
    action: string;
    expected_impact: string;
  }[];
  confidence_notes: string;
}

export interface ReportData {
  site_name: string;
  site_domain: string;
  report_name: string;
  description?: string;
  logo_url?: string;
  brand_color?: string;
  date_from: string;
  date_to: string;
  metrics: {
    visitors: number;
    pageviews: number;
    sessions: number;
    bounce_rate: number;
    views_per_session: number;
    avg_duration: number;
    total_revenue?: number;
    purchases?: number;
    ecommerce_conversion_rate?: number;
    avg_scroll_depth?: number;
    avg_active_time?: number;
    returning_visitors?: number;
    returning_percentage?: number;
  };
  timeseries: { date: string; visitors: number; pageviews: number }[];
  top_pages: PathViews[];
  top_referrers: SourceVisitors[];
  browsers: NameValue[];
  operating_systems: NameValue[];
  device_types: NameValue[];
  countries: CountryRow[];
  entry_pages: PathViews[];
  exit_pages: PathViews[];
  utm_sources: NameVisitors[];
  utm_mediums: NameVisitors[];
  utm_campaigns: NameVisitors[];
  ecommerce_funnel?: {
    sessions: number;
    add_to_cart: number;
    begin_checkout: number;
    purchases: number;
    abandoned_rate: number;
    abandoned_value: number;
  };
  ecommerce_sources?: { name: string; revenue: number; purchases: number }[];
  ecommerce_campaigns?: { name: string; revenue: number; purchases: number }[];
  top_products?: {
    name: string;
    revenue: number;
    quantity: number;
    abandoned?: number;
    abandoned_value?: number;
  }[];
  revenue_timeseries?: { date: string; revenue: number }[];
  leads: LeadRow[];
  lead_sources: SourceCount[];
  lead_mediums: { medium: string; count: number }[];
  lead_campaigns: { campaign: string; count: number }[];
  campaign_data: CampaignRow[];
  campaign_summary: Record<string, ProviderSummary>;
  ai_analysis?: AIAnalysisData;
}

export interface ReportFilter {
  key: string;
  label: string;
  value: string;
}
