'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { BarChart } from '@/components/charts/bar-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { DataTable } from '@/components/tables/data-table';
import { AIReportCard } from '@/components/ai-report-card';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface NameValue { name: string; value: number }
interface NameVisitors { name: string; visitors: number }
interface PathViews { path: string; views: number }
interface SourceVisitors { source: string; visitors: number }
interface CountryRow { code: string; name: string; visitors: number }
interface LeadRow {
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
interface SourceCount { source: string; count: number }

interface AIAnalysisData {
  summary: string;
  highlights: { type: string; title: string; detail: string; metric?: string; change_pct?: number }[];
  lead_insights: { top_sources: string; recommendations: string[]; quality_assessment: string };
  campaign_insights: { best_performing: string; worst_performing: string; budget_recommendations: string[]; new_ideas: string[] };
  traffic_insights: { trends: string; anomalies: string[]; opportunities: string[] };
  page_insights: { top_performers: string; underperformers: string; optimization_suggestions: string[] };
  comparison?: { summary: string; improvements: string[]; regressions: string[]; campaign_comparison: string };
  action_items: { priority: string; category: string; action: string; expected_impact: string }[];
  confidence_notes: string;
}

interface ReportData {
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
  leads: LeadRow[];
  lead_sources: SourceCount[];
  lead_mediums: { medium: string; count: number }[];
  lead_campaigns: { campaign: string; count: number }[];
  ai_analysis?: AIAnalysisData;
}

interface Filter { key: string; label: string; value: string }

const DATE_RANGES = [
  { value: 'today', label: 'Vandaag' },
  { value: 'last_7_days', label: 'Laatste 7 dagen' },
  { value: 'last_30_days', label: 'Laatste 30 dagen' },
  { value: 'last_90_days', label: 'Laatste 90 dagen' },
  { value: 'last_365_days', label: 'Laatste 12 maanden' },
  { value: 'this_month', label: 'Deze maand' },
  { value: 'last_month', label: 'Vorige maand' },
] as const;

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [error, setError] = useState('');
  const [range, setRange] = useState('last_30_days');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'entry' | 'exit'>('pages');
  const [deviceTab, setDeviceTab] = useState<'browsers' | 'os' | 'devices'>('browsers');
  const [expandedLead, setExpandedLead] = useState<number | null>(null);

  const fetchReport = useCallback((pw?: string) => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (pw) params.set('password', pw);
    params.set('range', range);
    filters.forEach((f) => params.set(f.key, f.value));

    const url = `/api/reports/shared/${token}/data?${params.toString()}`;
    fetch(url)
      .then(async (res) => {
        if (res.status === 401) { setNeedsPassword(true); setLoading(false); return; }
        if (res.status === 403) { setNeedsPassword(true); setError('Onjuist wachtwoord'); setLoading(false); return; }
        if (!res.ok) { setError('Rapport laden mislukt'); setLoading(false); return; }
        const d = await res.json();
        setData({
          site_name: d.site_name ?? '',
          site_domain: d.site_domain ?? '',
          report_name: d.report_name ?? '',
          description: d.description ?? '',
          logo_url: d.logo_url,
          brand_color: d.brand_color,
          date_from: d.date_from ?? '',
          date_to: d.date_to ?? '',
          metrics: {
            visitors: d.metrics?.visitors ?? 0,
            pageviews: d.metrics?.pageviews ?? 0,
            sessions: d.metrics?.sessions ?? 0,
            bounce_rate: d.metrics?.bounce_rate ?? 0,
            views_per_session: d.metrics?.views_per_session ?? 0,
            avg_duration: d.metrics?.avg_duration ?? 0,
          },
          timeseries: d.timeseries ?? [],
          top_pages: d.top_pages ?? [],
          top_referrers: d.top_referrers ?? [],
          browsers: d.browsers ?? [],
          operating_systems: d.operating_systems ?? [],
          device_types: d.device_types ?? [],
          countries: d.countries ?? [],
          entry_pages: d.entry_pages ?? [],
          exit_pages: d.exit_pages ?? [],
          utm_sources: d.utm_sources ?? [],
          utm_mediums: d.utm_mediums ?? [],
          utm_campaigns: d.utm_campaigns ?? [],
          leads: d.leads ?? [],
          lead_sources: d.lead_sources ?? [],
          lead_mediums: d.lead_mediums ?? [],
          lead_campaigns: d.lead_campaigns ?? [],
          ai_analysis: d.ai_analysis ?? undefined,
        });
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch(() => { setError('Rapport laden mislukt'); setLoading(false); });
  }, [token, range, filters]);

  useEffect(() => {
    fetchReport(savedPassword || undefined);
  }, [fetchReport, savedPassword]);

  const addFilter = (key: string, label: string, value: string) => {
    if (filters.some((f) => f.key === key && f.value === value)) return;
    setFilters((prev) => [...prev.filter((f) => f.key !== key), { key, label, value }]);
  };

  const removeFilter = (key: string) => {
    setFilters((prev) => prev.filter((f) => f.key !== key));
  };

  /* ---- Loading ---- */
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Rapport laden...</p>
        </div>
      </div>
    );
  }

  /* ---- Password gate ---- */
  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8">
          <h1 className="text-lg font-bold">Wachtwoord beveiligd</h1>
          <p className="text-sm text-muted-foreground">Dit rapport vereist een wachtwoord om te bekijken.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord invoeren"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setSavedPassword(password); setNeedsPassword(false); }
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setSavedPassword(password); setNeedsPassword(false); }}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Rapport bekijken
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-red-600">{error || 'Rapport niet gevonden'}</p>
      </div>
    );
  }

  const m = data.metrics;

  /* ---- Dashboard ---- */
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{data.report_name}</h1>
            <p className="truncate text-xs text-muted-foreground">{data.site_name}{data.site_domain ? ` · ${data.site_domain}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Active filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {f.label}: {f.value}
                <button onClick={() => removeFilter(f.key)} className="ml-1 hover:text-primary/70">✕</button>
              </span>
            ))}
            <button
              onClick={() => setFilters([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Alles wissen
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Bezoekers" value={m.visitors.toLocaleString()} />
          <MetricCard title="Paginaweergaven" value={m.pageviews.toLocaleString()} />
          <MetricCard title="Sessies" value={m.sessions.toLocaleString()} />
          <MetricCard title="Bouncepercentage" value={`${m.bounce_rate}%`} />
          <MetricCard title="Weergaven / sessie" value={m.views_per_session.toString()} />
          <MetricCard title="Gem. duur" value={formatDuration(m.avg_duration)} />
        </div>

        {/* Timeseries chart */}
        {data.timeseries.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Bezoekers &amp; paginaweergaven in de tijd</h2>
            <TimeSeries data={data.timeseries} period={range} />
          </div>
        )}

        {/* Pages + Referrers row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pages with tabs */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-1 border-b px-4 py-2">
              {(['pages', 'entry', 'exit'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab === 'pages' ? 'Toppagina\'s' : tab === 'entry' ? 'Instappagina\'s' : 'Uitstappagina\'s'}
                </button>
              ))}
            </div>
            <div className="p-0">
              {activeTab === 'pages' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Pagina' },
                    { key: 'views', label: 'Weergaven', align: 'right' },
                  ]}
                  data={data.top_pages}
                  pageSize={10}
                  searchable
                  borderless
                />
              )}
              {activeTab === 'entry' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Pagina' },
                    { key: 'views', label: 'Instappen', align: 'right' },
                  ]}
                  data={data.entry_pages}
                  pageSize={10}
                  searchable
                  borderless
                />
              )}
              {activeTab === 'exit' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Pagina' },
                    { key: 'views', label: 'Uitstappen', align: 'right' },
                  ]}
                  data={data.exit_pages}
                  pageSize={10}
                  searchable
                  borderless
                />
              )}
            </div>
          </div>

          {/* Referrers */}
          <DataTable
            title="Topverwijzers"
            columns={[
              { key: 'source', label: 'Bron' },
              { key: 'visitors', label: 'Bezoekers', align: 'right' },
            ]}
            data={data.top_referrers.map((r) => ({
              ...r,
              _onClick: () => addFilter('referrer', 'Referrer', r.source),
            }))}
            pageSize={10}
            searchable
          />
        </div>

        {/* Countries + Devices row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Countries */}
          {data.countries.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Landen</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Land</th>
                      <th className="px-4 py-2 text-right font-medium">Bezoekers</th>
                      <th className="px-4 py-2 text-right font-medium w-32">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.slice(0, 10).map((c) => {
                      const pct = m.visitors > 0 ? Math.round((c.visitors / m.visitors) * 100) : 0;
                      return (
                        <tr
                          key={c.code}
                          className="border-b text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => addFilter('country', 'Land', c.code)}
                        >
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{c.visitors.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-8 text-xs tabular-nums text-muted-foreground">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Devices / Browsers / OS */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center gap-1 border-b px-4 py-2">
              {(['browsers', 'os', 'devices'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDeviceTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    deviceTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab === 'browsers' ? 'Browsers' : tab === 'os' ? 'OS' : 'Apparaten'}
                </button>
              ))}
            </div>
            <div className="p-6">
              {deviceTab === 'browsers' && <PieChart data={data.browsers} />}
              {deviceTab === 'os' && <PieChart data={data.operating_systems} />}
              {deviceTab === 'devices' && <PieChart data={data.device_types} />}
            </div>
          </div>
        </div>

        {/* UTM section */}
        {(data.utm_sources.length > 0 || data.utm_mediums.length > 0 || data.utm_campaigns.length > 0) && (
          <>
            <h2 className="text-sm font-medium text-muted-foreground pt-2">Campagnetracking (UTM)</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.utm_sources.length > 0 && (
                <DataTable
                  title="UTM-bronnen"
                  columns={[
                    { key: 'name', label: 'Bron' },
                    { key: 'visitors', label: 'Bezoekers', align: 'right' },
                  ]}
                  data={data.utm_sources.map((r) => ({
                    ...r,
                    _onClick: () => addFilter('utm_source', 'UTM Source', r.name),
                  }))}
                  pageSize={10}
                />
              )}
              {data.utm_mediums.length > 0 && (
                <DataTable
                  title="UTM-media"
                  columns={[
                    { key: 'name', label: 'Medium' },
                    { key: 'visitors', label: 'Bezoekers', align: 'right' },
                  ]}
                  data={data.utm_mediums.map((r) => ({
                    ...r,
                    _onClick: () => addFilter('utm_medium', 'UTM Medium', r.name),
                  }))}
                  pageSize={10}
                />
              )}
              {data.utm_campaigns.length > 0 && (
                <DataTable
                  title="UTM-campagnes"
                  columns={[
                    { key: 'name', label: 'Campagne' },
                    { key: 'visitors', label: 'Bezoekers', align: 'right' },
                  ]}
                  data={data.utm_campaigns.map((r) => ({
                    ...r,
                    _onClick: () => addFilter('utm_campaign', 'UTM Campaign', r.name),
                  }))}
                  pageSize={10}
                />
              )}
            </div>
          </>
        )}

        {/* Leads section */}
        {data.leads.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-muted-foreground pt-2">Leads</h2>

            {/* Lead source breakdown */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.lead_sources.length > 0 && (
                <DataTable
                  title="Leadbronnen"
                  columns={[
                    { key: 'source', label: 'Bron' },
                    { key: 'count', label: 'Leads', align: 'right' },
                  ]}
                  data={data.lead_sources}
                  pageSize={10}
                />
              )}
              {data.lead_mediums.length > 0 && (
                <DataTable
                  title="Lead-media"
                  columns={[
                    { key: 'medium', label: 'Medium' },
                    { key: 'count', label: 'Leads', align: 'right' },
                  ]}
                  data={data.lead_mediums}
                  pageSize={10}
                />
              )}
              {data.lead_campaigns.length > 0 && (
                <DataTable
                  title="Leadcampagnes"
                  columns={[
                    { key: 'campaign', label: 'Campagne' },
                    { key: 'count', label: 'Leads', align: 'right' },
                  ]}
                  data={data.lead_campaigns}
                  pageSize={10}
                />
              )}
            </div>

            {/* Leads table */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Alle leads ({data.leads.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-medium">Naam</th>
                      <th className="px-4 py-2.5 text-left font-medium">E-mail</th>
                      <th className="px-4 py-2.5 text-left font-medium">Bron</th>
                      <th className="px-4 py-2.5 text-left font-medium">Campagne</th>
                      <th className="px-4 py-2.5 text-left font-medium">Formulier</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leads.map((lead) => {
                      const sourceLabel = lead.utm_source
                        ? [lead.utm_source, lead.utm_medium].filter(Boolean).join(' / ')
                        : lead.referrer_hostname || 'Direct';
                      const srcKey = (lead.utm_source || lead.referrer_hostname || '').toLowerCase();
                      const sourceBadge = srcKey.includes('google')
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : srcKey.includes('facebook') || srcKey.includes('meta') || srcKey.includes('instagram')
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : srcKey.includes('linkedin')
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300';
                      const statusColor: Record<string, string> = {
                        new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                        contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                        qualified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
                        converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                        archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
                      };
                      const dateStr = new Date(lead.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      });
                      return (
                        <>
                          <tr
                            key={lead.id}
                            className="border-b hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                            onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                          >
                            <td className="px-4 py-2.5 font-medium">{lead.lead_name || <span className="text-muted-foreground italic">—</span>}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{lead.lead_email || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadge}`}>
                                {sourceLabel}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{lead.utm_campaign || '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{lead.form_id || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[lead.status] || ''}`}>
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{dateStr}</td>
                          </tr>
                          {expandedLead === lead.id && (
                            <tr key={`${lead.id}-detail`} className="border-b bg-muted/30">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Contactgegevens</p>
                                    {lead.lead_name && <p><span className="text-muted-foreground">Naam:</span> {lead.lead_name}</p>}
                                    {lead.lead_email && <p><span className="text-muted-foreground">E-mail:</span> {lead.lead_email}</p>}
                                    {lead.lead_phone && <p><span className="text-muted-foreground">Telefoon:</span> {lead.lead_phone}</p>}
                                    {lead.lead_company && <p><span className="text-muted-foreground">Bedrijf:</span> {lead.lead_company}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Attributie</p>
                                    <p><span className="text-muted-foreground">Bron:</span> {lead.utm_source || lead.referrer_hostname || 'Direct'}</p>
                                    {lead.utm_medium && <p><span className="text-muted-foreground">Medium:</span> {lead.utm_medium}</p>}
                                    {lead.utm_campaign && <p><span className="text-muted-foreground">Campagne:</span> {lead.utm_campaign}</p>}
                                    {lead.page_path && <p><span className="text-muted-foreground">Pagina:</span> {lead.page_path}</p>}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Context</p>
                                    {lead.country_code && <p><span className="text-muted-foreground">Locatie:</span> {lead.city ? `${lead.city}, ` : ''}{lead.country_code}</p>}
                                    {lead.device_type && <p><span className="text-muted-foreground">Apparaat:</span> {lead.device_type}</p>}
                                    {lead.lead_message && (
                                      <div className="mt-2">
                                        <p className="text-muted-foreground">Bericht:</p>
                                        <p className="mt-0.5 rounded bg-background p-2 text-xs whitespace-pre-wrap">{lead.lead_message}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* All form data */}
                                {lead.lead_data && typeof lead.lead_data === 'object' && Object.keys(lead.lead_data).length > 0 && (
                                  <div className="mt-4 border-t pt-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Alle formulierdata</p>
                                    <div className="rounded border bg-background overflow-hidden">
                                      <table className="w-full text-xs">
                                        <tbody>
                                          {Object.entries(lead.lead_data as Record<string, string>).map(([key, value]) => (
                                            <tr key={key} className="border-b last:border-0">
                                              <td className="px-3 py-1.5 text-muted-foreground font-medium whitespace-nowrap align-top w-1/3">{key}</td>
                                              <td className="px-3 py-1.5 whitespace-pre-wrap break-words">{value}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* AI Insights (if available in shared report) */}
        {data.ai_analysis && (
          <>
            <h2 className="text-sm font-medium text-muted-foreground pt-2">AI-inzichten</h2>
            <div className="rounded-lg border bg-card p-6">
              <AIReportCard
                analysis={data.ai_analysis as any}
                periodStart={data.date_from}
                periodEnd={data.date_to}
                compact
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
