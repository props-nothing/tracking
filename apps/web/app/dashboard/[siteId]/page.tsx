'use client';

import { use } from 'react';
import { useSite } from '@/hooks/use-site';
import { useStats } from '@/hooks/use-stats';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { DataTable } from '@/components/tables/data-table';
import { ExportBar } from '@/components/export-bar';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { site, loading: siteLoading } = useSite(siteId);
  const { period, queryString } = useDashboard();
  const { stats, loading: statsLoading } = useStats(siteId, queryString);

  if (siteLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{site?.name || 'Site Analytics'}</h1>
          <p className="text-sm text-muted-foreground">{site?.domain}</p>
        </div>
      </div>

      <ExportBar siteId={siteId} period={period} />

      {statsLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading analytics...</div>
      ) : stats ? (
        <>
          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Page Views" value={formatNumber(stats.pageviews)} />
            <MetricCard title="Unique Visitors" value={formatNumber(stats.unique_visitors)} />
            <MetricCard title="Sessions" value={formatNumber(stats.sessions)} />
            <MetricCard title="Bounce Rate" value={`${stats.bounce_rate}%`} />
            <MetricCard title="Views / Session" value={stats.views_per_session.toString()} />
            <MetricCard title="Avg. Engaged Time" value={formatDuration(stats.avg_engaged_time)} />
          </div>

          {/* Time Series Chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Visitors & Page Views Over Time</h2>
            <TimeSeries data={stats.timeseries} />
          </div>

          {/* Breakdown Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Top Pages"
              columns={[
                { key: 'path', label: 'Page' },
                { key: 'count', label: 'Views', align: 'right' },
              ]}
              data={stats.top_pages}
            />

            <DataTable
              title="Top Referrers"
              columns={[
                { key: 'source', label: 'Source' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={stats.top_referrers}
            />

            <DataTable
              title="Countries"
              columns={[
                { key: 'country', label: 'Country' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={stats.top_countries}
            />

            <DataTable
              title="Browsers"
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={stats.top_browsers}
            />

            <DataTable
              title="Operating Systems"
              columns={[
                { key: 'os', label: 'OS' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={stats.top_os}
            />

            <DataTable
              title="Devices"
              columns={[
                { key: 'device', label: 'Device' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={stats.top_devices}
            />
          </div>

          {/* Tracking Code */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 text-sm font-medium">Tracking Code</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Add this snippet before the closing &lt;/head&gt; tag on your website.
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {`<script defer src="${typeof window !== 'undefined' ? window.location.origin : ''}/t.js" data-site-id="${siteId}"></script>`}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
