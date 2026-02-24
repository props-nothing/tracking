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
import { LoadingState } from '@/components/shared';
import { formatDuration, formatNumber, truncatePath } from '@/lib/formatters';
import { getPeriodDateRange } from '@/lib/query-helpers';

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
  const { periodStart, periodEnd } = useMemo(
    () => getPeriodDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  if (siteLoading) {
    return <LoadingState />;
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
              {`<script defer src="${typeof window !== 'undefined' ? window.location.origin : ''}/t.js" data-site-id="${siteId}" data-api="${typeof window !== 'undefined' ? window.location.origin : ''}/api/collect"></script>`}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
