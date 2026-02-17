'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { BarChart } from '@/components/charts/bar-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { DataTable } from '@/components/tables/data-table';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface NameValue { name: string; value: number }
interface NameVisitors { name: string; visitors: number }
interface PathViews { path: string; views: number }
interface SourceVisitors { source: string; visitors: number }
interface CountryRow { code: string; name: string; visitors: number }

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
}

interface Filter { key: string; label: string; value: string }

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'last_365_days', label: 'Last 12 months' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
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
        if (res.status === 403) { setNeedsPassword(true); setError('Incorrect password'); setLoading(false); return; }
        if (!res.ok) { setError('Failed to load report'); setLoading(false); return; }
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
        });
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load report'); setLoading(false); });
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
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  /* ---- Password gate ---- */
  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8">
          <h1 className="text-lg font-bold">Password Protected</h1>
          <p className="text-sm text-muted-foreground">This report requires a password to view.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setSavedPassword(password); setNeedsPassword(false); }
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setSavedPassword(password); setNeedsPassword(false); }}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View Report
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-red-600">{error || 'Report not found'}</p>
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
              Clear all
            </button>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Visitors" value={m.visitors.toLocaleString()} />
          <MetricCard title="Pageviews" value={m.pageviews.toLocaleString()} />
          <MetricCard title="Sessions" value={m.sessions.toLocaleString()} />
          <MetricCard title="Bounce Rate" value={`${m.bounce_rate}%`} />
          <MetricCard title="Views / Session" value={m.views_per_session.toString()} />
          <MetricCard title="Avg. Duration" value={formatDuration(m.avg_duration)} />
        </div>

        {/* Timeseries chart */}
        {data.timeseries.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Visitors &amp; Pageviews Over Time</h2>
            <TimeSeries data={data.timeseries} />
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
                  {tab === 'pages' ? 'Top Pages' : tab === 'entry' ? 'Entry Pages' : 'Exit Pages'}
                </button>
              ))}
            </div>
            <div className="p-0">
              {activeTab === 'pages' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Page' },
                    { key: 'views', label: 'Views', align: 'right' },
                  ]}
                  data={data.top_pages}
                  pageSize={10}
                  searchable
                />
              )}
              {activeTab === 'entry' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Page' },
                    { key: 'views', label: 'Entries', align: 'right' },
                  ]}
                  data={data.entry_pages}
                  pageSize={10}
                />
              )}
              {activeTab === 'exit' && (
                <DataTable
                  title=""
                  columns={[
                    { key: 'path', label: 'Page' },
                    { key: 'views', label: 'Exits', align: 'right' },
                  ]}
                  data={data.exit_pages}
                  pageSize={10}
                />
              )}
            </div>
          </div>

          {/* Referrers */}
          <DataTable
            title="Top Referrers"
            columns={[
              { key: 'source', label: 'Source' },
              { key: 'visitors', label: 'Visitors', align: 'right' },
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
                <h3 className="text-sm font-medium">Countries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Country</th>
                      <th className="px-4 py-2 text-right font-medium">Visitors</th>
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
                          onClick={() => addFilter('country', 'Country', c.code)}
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
                  {tab === 'browsers' ? 'Browsers' : tab === 'os' ? 'OS' : 'Devices'}
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
            <h2 className="text-sm font-medium text-muted-foreground pt-2">Campaign Tracking (UTM)</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.utm_sources.length > 0 && (
                <DataTable
                  title="UTM Sources"
                  columns={[
                    { key: 'name', label: 'Source' },
                    { key: 'visitors', label: 'Visitors', align: 'right' },
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
                  title="UTM Mediums"
                  columns={[
                    { key: 'name', label: 'Medium' },
                    { key: 'visitors', label: 'Visitors', align: 'right' },
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
                  title="UTM Campaigns"
                  columns={[
                    { key: 'name', label: 'Campaign' },
                    { key: 'visitors', label: 'Visitors', align: 'right' },
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

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          Powered by <span className="font-semibold">Tracking</span> — Privacy-friendly analytics
        </div>
      </main>
    </div>
  );
}
