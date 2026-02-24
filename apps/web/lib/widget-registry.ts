// ── Widget Registry ───────────────────────────────────────────
// Defines all available widgets and the default dashboard layout.

import type { WidgetConfig, MetricKey, TableDataKey } from '@/types/dashboard-layout';

/* ── Metric metadata ──────────────────────────────────────── */
export interface MetricOption {
  key: MetricKey;
  label: string;
  format: 'number' | 'percentage' | 'duration' | 'text';
  subtitleMetric?: string;
  subtitleFormat?: 'number' | 'text';
}

export const METRIC_OPTIONS: MetricOption[] = [
  { key: 'pageviews', label: 'Paginaweergaven', format: 'number' },
  { key: 'unique_visitors', label: 'Unieke bezoekers', format: 'number' },
  { key: 'sessions', label: 'Sessies', format: 'number' },
  { key: 'bounce_rate', label: 'Bouncepercentage', format: 'percentage' },
  { key: 'views_per_session', label: 'Weergaven / sessie', format: 'number' },
  { key: 'avg_engaged_time', label: 'Gem. actieve tijd', format: 'duration' },
  { key: 'avg_session_duration', label: 'Gem. sessieduur', format: 'duration' },
  { key: 'total_leads', label: 'Leads', format: 'number' },
  { key: 'conversion_rate', label: 'Conversiepercentage', format: 'percentage' },
  { key: 'avg_scroll_depth', label: 'Gem. scrolldiepte', format: 'percentage' },
  { key: 'top_page', label: 'Toppagina', format: 'text', subtitleMetric: 'top_page_count', subtitleFormat: 'number' },
  { key: 'returning_visitor_pct', label: 'Terugkerend', format: 'percentage', subtitleMetric: 'returning_visitor_count', subtitleFormat: 'number' },
];

/* ── Table data source metadata ───────────────────────────── */
export interface TableOption {
  key: TableDataKey;
  label: string;
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  /** Field used as "name" for bar/pie charts derived from this data */
  nameField: string;
  /** Field used as "value" for bar/pie charts derived from this data */
  valueField: string;
}

export const TABLE_OPTIONS: TableOption[] = [
  {
    key: 'top_pages',
    label: "Toppagina's",
    columns: [
      { key: 'path', label: 'Pagina' },
      { key: 'count', label: 'Weergaven', align: 'right' },
    ],
    nameField: 'path',
    valueField: 'count',
  },
  {
    key: 'top_referrers',
    label: 'Topverwijzers',
    columns: [
      { key: 'source', label: 'Bron' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'source',
    valueField: 'count',
  },
  {
    key: 'top_countries',
    label: 'Landen',
    columns: [
      { key: 'country', label: 'Land' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'country',
    valueField: 'count',
  },
  {
    key: 'top_cities',
    label: 'Steden',
    columns: [
      { key: 'city', label: 'Stad' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'city',
    valueField: 'count',
  },
  {
    key: 'top_browsers',
    label: 'Browsers',
    columns: [
      { key: 'browser', label: 'Browser' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'browser',
    valueField: 'count',
  },
  {
    key: 'top_os',
    label: 'Besturingssystemen',
    columns: [
      { key: 'os', label: 'OS' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'os',
    valueField: 'count',
  },
  {
    key: 'top_devices',
    label: 'Apparaten',
    columns: [
      { key: 'device', label: 'Apparaat' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'device',
    valueField: 'count',
  },
  {
    key: 'entry_pages',
    label: "Instappagina's",
    columns: [
      { key: 'path', label: 'Pagina' },
      { key: 'count', label: 'Instap', align: 'right' },
    ],
    nameField: 'path',
    valueField: 'count',
  },
  {
    key: 'exit_pages',
    label: "Uitstappagina's",
    columns: [
      { key: 'path', label: 'Pagina' },
      { key: 'count', label: 'Uitstap', align: 'right' },
    ],
    nameField: 'path',
    valueField: 'count',
  },
  {
    key: 'utm_sources',
    label: 'UTM-bronnen',
    columns: [
      { key: 'source', label: 'Bron' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'source',
    valueField: 'count',
  },
  {
    key: 'utm_mediums',
    label: 'UTM-media',
    columns: [
      { key: 'medium', label: 'Medium' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'medium',
    valueField: 'count',
  },
  {
    key: 'utm_campaigns',
    label: 'UTM-campagnes',
    columns: [
      { key: 'campaign', label: 'Campagne' },
      { key: 'count', label: 'Bezoeken', align: 'right' },
    ],
    nameField: 'campaign',
    valueField: 'count',
  },
];

/* ── Default widgets ──────────────────────────────────────── */
let _widgetId = 0;
function wid(): string {
  return `w-${++_widgetId}`;
}

export function getDefaultWidgets(): WidgetConfig[] {
  _widgetId = 0;
  return [
    // Row 1: Metric cards (4 columns)
    { id: wid(), type: 'metric-card', title: 'Paginaweergaven', colSpan: 1, config: { metric: 'pageviews', format: 'number' } },
    { id: wid(), type: 'metric-card', title: 'Unieke bezoekers', colSpan: 1, config: { metric: 'unique_visitors', format: 'number' } },
    { id: wid(), type: 'metric-card', title: 'Sessies', colSpan: 1, config: { metric: 'sessions', format: 'number' } },
    { id: wid(), type: 'metric-card', title: 'Bouncepercentage', colSpan: 1, config: { metric: 'bounce_rate', format: 'percentage' } },

    // Row 2: More metric cards
    { id: wid(), type: 'metric-card', title: 'Weergaven / sessie', colSpan: 1, config: { metric: 'views_per_session', format: 'number' } },
    { id: wid(), type: 'metric-card', title: 'Gem. actieve tijd', colSpan: 1, config: { metric: 'avg_engaged_time', format: 'duration' } },
    { id: wid(), type: 'metric-card', title: 'Gem. sessieduur', colSpan: 1, config: { metric: 'avg_session_duration', format: 'duration' } },
    { id: wid(), type: 'metric-card', title: 'Leads', colSpan: 1, config: { metric: 'total_leads', format: 'number' } },

    // Row 3: More metric cards
    { id: wid(), type: 'metric-card', title: 'Conversiepercentage', colSpan: 1, config: { metric: 'conversion_rate', format: 'percentage' } },
    { id: wid(), type: 'metric-card', title: 'Gem. scrolldiepte', colSpan: 1, config: { metric: 'avg_scroll_depth', format: 'percentage' } },
    {
      id: wid(), type: 'metric-card', title: 'Toppagina', colSpan: 1,
      config: { metric: 'top_page', format: 'text', subtitleMetric: 'top_page_count', subtitleFormat: 'number' },
    },
    {
      id: wid(), type: 'metric-card', title: 'Terugkerend', colSpan: 1,
      config: { metric: 'returning_visitor_pct', format: 'percentage', subtitleMetric: 'returning_visitor_count', subtitleFormat: 'number' },
    },

    // Time series chart (full width)
    {
      id: wid(), type: 'time-series', title: 'Bezoekers & paginaweergaven over tijd', colSpan: 4,
      config: { showPageviews: true, showVisitors: true, showLeads: false },
    },

    // Breakdown tables (2 per row)
    {
      id: wid(), type: 'data-table', title: "Toppagina's", colSpan: 2,
      config: {
        dataKey: 'top_pages',
        columns: [{ key: 'path', label: 'Pagina' }, { key: 'count', label: 'Weergaven', align: 'right' }],
      },
    },
    {
      id: wid(), type: 'data-table', title: 'Topverwijzers', colSpan: 2,
      config: {
        dataKey: 'top_referrers',
        columns: [{ key: 'source', label: 'Bron' }, { key: 'count', label: 'Bezoeken', align: 'right' }],
      },
    },
    {
      id: wid(), type: 'data-table', title: 'Landen', colSpan: 2,
      config: {
        dataKey: 'top_countries',
        columns: [{ key: 'country', label: 'Land' }, { key: 'count', label: 'Bezoeken', align: 'right' }],
      },
    },
    {
      id: wid(), type: 'data-table', title: 'Browsers', colSpan: 2,
      config: {
        dataKey: 'top_browsers',
        columns: [{ key: 'browser', label: 'Browser' }, { key: 'count', label: 'Bezoeken', align: 'right' }],
      },
    },
    {
      id: wid(), type: 'data-table', title: 'Besturingssystemen', colSpan: 2,
      config: {
        dataKey: 'top_os',
        columns: [{ key: 'os', label: 'OS' }, { key: 'count', label: 'Bezoeken', align: 'right' }],
      },
    },
    {
      id: wid(), type: 'data-table', title: 'Apparaten', colSpan: 2,
      config: {
        dataKey: 'top_devices',
        columns: [{ key: 'device', label: 'Apparaat' }, { key: 'count', label: 'Bezoeken', align: 'right' }],
      },
    },

    // AI Insights (full width)
    { id: wid(), type: 'ai-insights', title: 'AI Inzichten', colSpan: 4, config: {} },

    // Tracking code (full width)
    { id: wid(), type: 'tracking-code', title: 'Trackingcode', colSpan: 4, config: {} },
  ];
}

/** Generate a new unique widget id */
export function generateWidgetId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
