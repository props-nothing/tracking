'use client';

import { use, useEffect, useState } from 'react';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { BarChart } from '@/components/charts/bar-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { DataTable } from '@/components/tables/data-table';

interface ReportData {
  site_name: string;
  report_name: string;
  metrics: {
    visitors: number;
    pageviews: number;
    bounce_rate: number;
    avg_duration: number;
  };
  timeseries: { date: string; visitors: number; pageviews: number }[];
  top_pages: { path: string; views: number }[];
  top_referrers: { source: string; visitors: number }[];
  browsers: { name: string; value: number }[];
  countries: { name: string; visitors: number }[];
}

export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const fetchReport = (pw?: string) => {
    setLoading(true);
    setError('');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const url = `/api/reports/shared/${token}/data${pw ? `?password=${encodeURIComponent(pw)}` : ''}`;
    fetch(url, { headers })
      .then(async (res) => {
        if (res.status === 401) {
          setNeedsPassword(true);
          setLoading(false);
          return;
        }
        if (res.status === 403) {
          setNeedsPassword(true);
          setError('Incorrect password');
          setLoading(false);
          return;
        }
        const d = await res.json();
        // Map API response keys to local interface
        setData({
          site_name: d.site_name ?? '',
          report_name: d.report_name ?? '',
          metrics: {
            visitors: d.metrics?.visitors ?? 0,
            pageviews: d.metrics?.pageviews ?? 0,
            bounce_rate: d.metrics?.bounce_rate ?? 0,
            avg_duration: d.metrics?.avg_duration ?? 0,
          },
          timeseries: d.timeseries ?? [],
          top_pages: d.top_pages ?? [],
          top_referrers: d.top_referrers ?? [],
          browsers: d.browsers ?? [],
          countries: d.top_countries ?? d.countries ?? [],
        });
        setNeedsPassword(false);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load report');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8">
          <h1 className="text-lg font-bold">Password Protected</h1>
          <p className="text-sm text-muted-foreground">This report requires a password to view.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={(e) => e.key === 'Enter' && fetchReport(password)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => fetchReport(password)}
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">{error || 'Report not found'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{data.report_name}</h1>
        <p className="text-sm text-muted-foreground">{data.site_name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <MetricCard title="Visitors" value={data.metrics.visitors.toLocaleString()} />
        <MetricCard title="Pageviews" value={data.metrics.pageviews.toLocaleString()} />
        <MetricCard title="Bounce Rate" value={`${data.metrics.bounce_rate}%`} />
        <MetricCard title="Avg. Duration" value={`${data.metrics.avg_duration}s`} />
      </div>

      {data.timeseries && data.timeseries.length > 0 && (
        <div className="mb-8 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Visitors Over Time</h2>
          <TimeSeries data={data.timeseries} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <DataTable
          title="Top Pages"
          columns={[
            { key: 'path', label: 'Page' },
            { key: 'views', label: 'Views', align: 'right' },
          ]}
          data={data.top_pages || []}
        />
        <DataTable
          title="Top Referrers"
          columns={[
            { key: 'source', label: 'Source' },
            { key: 'visitors', label: 'Visitors', align: 'right' },
          ]}
          data={data.top_referrers || []}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {data.browsers && data.browsers.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Browsers</h2>
            <PieChart data={data.browsers} />
          </div>
        )}
        {data.countries && data.countries.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Top Countries</h2>
            <BarChart data={data.countries.map((c) => ({ name: c.name, value: c.visitors }))} />
          </div>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold">Tracking</span> — Privacy-friendly analytics
      </div>
    </div>
  );
}
