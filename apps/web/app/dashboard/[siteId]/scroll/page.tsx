'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { ScrollData } from '@/types';

export default function ScrollDepthPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<ScrollData>(siteId, queryString, 'scroll_depth');

  if (loading) return <LoadingState />;

  if (!data || data.sample_count === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Scrolldiepte" description="Hoe ver bezoekers scrollen op je pagina's" />
        <EmptyState
          title="Nog geen scrolldata"
          description="Scrolldiepte wordt automatisch vastgelegd bij elke paginaweergave. Data verschijnt zodra bezoekers browsen."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scrolldiepte"
        description={`Hoe ver bezoekers scrollen — ${data.sample_count.toLocaleString()} metingen`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Gem. scrolldiepte" value={`${data.avg_depth}%`} />
        <MetricCard title="Bereikt 25%" value={`${data.funnel.reached_25}%`} />
        <MetricCard title="Bereikt 50%" value={`${data.funnel.reached_50}%`} />
        <MetricCard title="Bereikt 75%" value={`${data.funnel.reached_75}%`} />
        <MetricCard title="Bereikt 100%" value={`${data.funnel.reached_100}%`} />
      </div>

      {/* Scroll funnel visualization */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium">Scrollfunnel</h2>
        <div className="space-y-3">
          {[
            { label: '25%', pct: data.funnel.reached_25 },
            { label: '50%', pct: data.funnel.reached_50 },
            { label: '75%', pct: data.funnel.reached_75 },
            { label: '100%', pct: data.funnel.reached_100 },
          ].map((stage) => (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="w-12 text-right text-sm font-medium text-muted-foreground">{stage.label}</span>
              <div className="flex-1 h-8 rounded-md bg-muted overflow-hidden">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${Math.max(stage.pct, 1)}%`,
                    backgroundColor: 'var(--color-chart-1)',
                  }}
                />
              </div>
              <span className="w-12 text-sm font-bold tabular-nums">{stage.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        title="Pagina's op scrolldiepte (laagste eerst)"
        columns={[
          { key: 'path', label: 'Pagina' },
          { key: 'sample_count', label: 'Metingen', align: 'right' as const },
          { key: 'avg_depth', label: 'Gem. diepte', align: 'right' as const, sortable: true },
          { key: 'pct_reached_50', label: '% Bereikt 50%', align: 'right' as const },
          { key: 'pct_reached_100', label: '% Bereikt 100%', align: 'right' as const },
        ]}
        data={data.pages.map((p) => ({
          ...p,
          avg_depth: `${p.avg_depth}%`,
          pct_reached_50: `${p.pct_reached_50}%`,
          pct_reached_100: `${p.pct_reached_100}%`,
        }))}
        searchable
      />
    </div>
  );
}
