'use client';

import { use, useMemo } from 'react';
import { useSite } from '@/hooks/use-site';
import { useStats } from '@/hooks/use-stats';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { TimeSeries } from '@/components/charts/time-series';
import { DataTable } from '@/components/tables/data-table';
import { ExportBar } from '@/components/export-bar';
import { AIInsightsPanel } from '@/components/ai-insights-panel';

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return `${ms ?? 0}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(n: number): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function truncatePath(path: string, maxLen = 24): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 1) + '…';
}

export default function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { site, loading: siteLoading } = useSite(siteId);
  const { period, queryString, customFrom, customTo } = useDashboard();
  const { stats, loading: statsLoading } = useStats(siteId, queryString);

  // Compute date range for AI insights
  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    let from: Date;
    const to = customTo ? new Date(customTo) : now;
    if (period === 'custom' && customFrom) {
      from = new Date(customFrom);
    } else {
      switch (period) {
        case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'yesterday': from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); break;
        case 'last_7_days': from = new Date(now.getTime() - 7 * 86400000); break;
        case 'last_90_days': from = new Date(now.getTime() - 90 * 86400000); break;
        case 'last_365_days': from = new Date(now.getTime() - 365 * 86400000); break;
        default: from = new Date(now.getTime() - 30 * 86400000);
      }
    }
    return {
      periodStart: from.toISOString().slice(0, 10),
      periodEnd: to.toISOString().slice(0, 10),
    };
  }, [period, customFrom, customTo]);

  if (siteLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{site?.name || 'Site-analyse'}</h1>
          <p className="text-sm text-muted-foreground">{site?.domain}</p>
        </div>
      </div>

      <ExportBar siteId={siteId} period={period} />

      {statsLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Analyse laden...</div>
      ) : stats ? (
        <>
          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Paginaweergaven" value={formatNumber(stats.pageviews)} />
            <MetricCard title="Unieke bezoekers" value={formatNumber(stats.unique_visitors)} />
            <MetricCard title="Sessies" value={formatNumber(stats.sessions)} />
            <MetricCard title="Bouncepercentage" value={`${stats.bounce_rate}%`} />
            <MetricCard title="Weergaven / sessie" value={stats.views_per_session.toString()} />
            <MetricCard title="Gem. actieve tijd" value={formatDuration(stats.avg_engaged_time)} />
            <MetricCard title="Gem. sessieduur" value={formatDuration(stats.avg_session_duration)} />
            <MetricCard title="Leads" value={formatNumber(stats.total_leads ?? 0)} />
            <MetricCard title="Conversiepercentage" value={`${stats.conversion_rate ?? 0}%`} />
            <MetricCard title="Gem. scrolldiepte" value={`${stats.avg_scroll_depth ?? 0}%`} />
            <MetricCard
              title="Toppagina"
              value={stats.top_page ? truncatePath(stats.top_page) : '—'}
              subtitle={stats.top_page ? `${formatNumber(stats.top_page_count)} weergaven` : undefined}
            />
            <MetricCard
              title="Terugkerend"
              value={`${stats.returning_visitor_pct ?? 0}%`}
              subtitle={`${formatNumber(stats.returning_visitor_count ?? 0)} bezoekers`}
            />
          </div>

          {/* Time Series Chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Bezoekers & paginaweergaven over tijd</h2>
            <TimeSeries data={stats.timeseries} period={period} />
          </div>

          {/* Breakdown Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Toppagina's"
              columns={[
                { key: 'path', label: 'Pagina' },
                { key: 'count', label: 'Weergaven', align: 'right' },
              ]}
              data={stats.top_pages}
            />

            <DataTable
              title="Topverwijzers"
              columns={[
                { key: 'source', label: 'Bron' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={stats.top_referrers}
            />

            <DataTable
              title="Landen"
              columns={[
                { key: 'country', label: 'Land' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={stats.top_countries}
            />

            <DataTable
              title="Browsers"
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={stats.top_browsers}
            />

            <DataTable
              title="Besturingssystemen"
              columns={[
                { key: 'os', label: 'OS' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={stats.top_os}
            />

            <DataTable
              title="Apparaten"
              columns={[
                { key: 'device', label: 'Apparaat' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={stats.top_devices}
            />
          </div>

          {/* AI Insights */}
          <AIInsightsPanel
            siteId={siteId}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />

          {/* Tracking Code */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 text-sm font-medium">Trackingcode</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Voeg dit fragment toe vóór de sluitende &lt;/head&gt;-tag op je website.
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
