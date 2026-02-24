// ── Dashboard Layout Types ────────────────────────────────────
// Type definitions for the configurable dashboard grid system.

export type WidgetType =
  | 'metric-card'
  | 'time-series'
  | 'data-table'
  | 'bar-chart'
  | 'pie-chart'
  | 'ai-insights'
  | 'tracking-code';

/** Metric keys available from the OverviewStats response. */
export type MetricKey =
  | 'pageviews'
  | 'unique_visitors'
  | 'sessions'
  | 'bounce_rate'
  | 'views_per_session'
  | 'avg_engaged_time'
  | 'avg_session_duration'
  | 'total_leads'
  | 'conversion_rate'
  | 'avg_scroll_depth'
  | 'top_page'
  | 'returning_visitor_pct';

/** Data keys for table / chart breakdown widgets. */
export type TableDataKey =
  | 'top_pages'
  | 'top_referrers'
  | 'top_countries'
  | 'top_cities'
  | 'top_browsers'
  | 'top_os'
  | 'top_devices'
  | 'entry_pages'
  | 'exit_pages'
  | 'utm_sources'
  | 'utm_mediums'
  | 'utm_campaigns';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  /** Column span in the 4-column grid: 1 | 2 | 3 | 4 */
  colSpan: 1 | 2 | 3 | 4;
  config: {
    // metric-card
    metric?: MetricKey;
    format?: 'number' | 'percentage' | 'duration' | 'text';
    subtitleMetric?: string;
    subtitleFormat?: 'number' | 'percentage' | 'duration' | 'text';
    // data-table
    dataKey?: TableDataKey;
    columns?: { key: string; label: string; align?: 'left' | 'right' }[];
    // time-series
    showPageviews?: boolean;
    showVisitors?: boolean;
    showLeads?: boolean;
    // bar-chart / pie-chart
    chartDataKey?: TableDataKey;
    nameField?: string;
    valueField?: string;
  };
}

export interface DashboardLayout {
  id: string;
  site_id: string;
  user_id: string;
  name: string;
  widgets: WidgetConfig[];
  created_at: string;
  updated_at: string;
}
