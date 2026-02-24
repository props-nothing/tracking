'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, PageHeader } from '@/components/shared';
import { formatDuration } from '@/lib/formatters';
import type { OverviewStats } from '@/types';

export default function PagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<OverviewStats>(siteId, queryString);

  return (
    <div className="space-y-8">
      <PageHeader title="Pagina's" description="Toppagina's, instappagina's en uitstappagina's" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <DataTable
            title="Alle pagina's"
            columns={[
              { key: 'path', label: 'Pagina' },
              { key: 'count', label: 'Weergaven', align: 'right' as const },
              { key: 'unique_visitors', label: 'Unieke bezoekers', align: 'right' as const },
              { key: 'avg_time_fmt', label: 'Gem. tijd', align: 'right' as const },
              { key: 'bounce_rate_fmt', label: 'Bounce %', align: 'right' as const },
            ]}
            data={(data?.top_pages || []).map((p) => ({
              ...p,
              avg_time_fmt: formatDuration(p.avg_time),
              bounce_rate_fmt: `${p.bounce_rate}%`,
            }))}
            searchable
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Instappagina's"
              columns={[
                { key: 'path', label: 'Pagina' },
                { key: 'count', label: 'Instappen', align: 'right' as const },
              ]}
              data={data?.entry_pages || []}
            />

            <DataTable
              title="Uitstappagina's"
              columns={[
                { key: 'path', label: 'Pagina' },
                { key: 'count', label: 'Uitstappen', align: 'right' as const },
              ]}
              data={data?.exit_pages || []}
            />
          </div>
        </>
      )}
    </div>
  );
}
