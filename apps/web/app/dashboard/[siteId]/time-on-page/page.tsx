'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import { formatDuration } from '@/lib/formatters';
import type { TimeOnPageData } from '@/types';

export default function TimeOnPagePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<TimeOnPageData>(siteId, queryString, 'time_on_page');

  if (loading) return <LoadingState />;

  if (!data || data.pages.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Tijd op pagina" description="Hoe lang bezoekers op elke pagina doorbrengen" />
        <EmptyState
          title="Nog geen data"
          description="Tijd op pagina wordt automatisch bijgehouden wanneer bezoekers tussen pagina's navigeren."
        />
      </div>
    );
  }

  const engagementRatio = data.avg_time_on_page > 0
    ? Math.round((data.avg_engaged_time / data.avg_time_on_page) * 100)
    : 0;

  const tableData = data.pages.map((p) => ({
    ...p,
    avg_time_fmt: formatDuration(p.avg_time_on_page),
    avg_engaged_fmt: formatDuration(p.avg_engaged_time),
    engagement_pct:
      p.avg_time_on_page > 0
        ? `${Math.round((p.avg_engaged_time / p.avg_time_on_page) * 100)}%`
        : '—',
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Tijd op pagina" description="Totale tijd, actieve betrokkenheid en uitsplitsing per pagina" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Gem. tijd op pagina" value={formatDuration(data.avg_time_on_page)} />
        <MetricCard title="Gem. actieve tijd" value={formatDuration(data.avg_engaged_time)} />
        <MetricCard title="Betrokkenheidsratio" value={`${engagementRatio}%`} />
        <MetricCard title="Gevolgde pagina's" value={data.pages.length.toString()} />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">Algehele betrokkenheid</h2>
        <div className="flex items-center gap-4">
          <div className="h-4 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${engagementRatio}%` }}
            />
          </div>
          <span className="text-sm font-medium">{engagementRatio}% actief</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Actieve tijd meet actieve interactie (scrollen, klikken, typen) versus inactieve of achtergrondtabtijd.
        </p>
      </div>

      <DataTable
        title="Tijd per pagina"
        columns={[
          { key: 'path', label: 'Pagina' },
          { key: 'avg_time_fmt', label: 'Gem. tijd', align: 'right' as const },
          { key: 'avg_engaged_fmt', label: 'Actieve tijd', align: 'right' as const },
          { key: 'engagement_pct', label: 'Betrokkenheid', align: 'right' as const },
          { key: 'unique_visitors', label: 'Bezoekers', align: 'right' as const, sortable: true },
        ]}
        data={tableData}
        searchable
      />
    </div>
  );
}
