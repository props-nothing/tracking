'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { UXData } from '@/types';

export default function UXIssuesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<UXData>(siteId, queryString, 'ux_issues');

  if (loading) return <LoadingState />;

  if (!data || (data.total_rage_clicks === 0 && data.total_dead_clicks === 0)) {
    return (
      <div className="space-y-8">
        <PageHeader title="UX-problemen" description="Rage-klikken en dead-klikken die frustratie aangeven" />
        <EmptyState
          title="Geen UX-problemen gedetecteerd"
          description="Rage-klikken (3+ snelle klikken) en dead-klikken (klikken zonder reactie) worden automatisch gevolgd."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="UX-problemen" description="Rage-klikken, dead-klikken en frustratiesignalen" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Rage-klikken" value={data.total_rage_clicks.toLocaleString()} />
        <MetricCard title="Dead-klikken" value={data.total_dead_clicks.toLocaleString()} />
        <MetricCard title="Getroffen elementen" value={(data.rage_click_elements.length + data.dead_click_elements.length).toString()} />
        <MetricCard title="Getroffen pagina's" value={data.issue_pages.length.toString()} />
      </div>

      <DataTable
        title="Pagina's met meeste problemen"
        columns={[
          { key: 'path', label: 'Pagina' },
          { key: 'rage_clicks', label: 'Rage-klikken', align: 'right' as const, sortable: true },
          { key: 'dead_clicks', label: 'Dead-klikken', align: 'right' as const, sortable: true },
          { key: 'total', label: 'Totaal', align: 'right' as const, sortable: true },
        ]}
        data={data.issue_pages}
        searchable
      />

      {data.rage_click_elements.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Meest rage-geklikte elementen</h2>
          <div className="space-y-2">
            {data.rage_click_elements.map((el, i) => (
              <div key={i} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-100 dark:bg-red-950 px-1.5 py-0.5 text-xs font-mono text-red-700 dark:text-red-300">
                      &lt;{el.element_tag}&gt;
                    </span>
                    {el.element_text && (
                      <span className="truncate text-sm text-muted-foreground">{el.element_text}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {el.pages.map((p) => (
                      <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{el.count}x</p>
                  <p className="text-xs text-muted-foreground">{el.unique_visitors} bezoekers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.dead_click_elements.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Meest dead-geklikte elementen</h2>
          <div className="space-y-2">
            {data.dead_click_elements.map((el, i) => (
              <div key={i} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 text-xs font-mono text-amber-700 dark:text-amber-300">
                      &lt;{el.element_tag}&gt;
                    </span>
                    {el.element_text && (
                      <span className="truncate text-sm text-muted-foreground">{el.element_text}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {el.pages.map((p) => (
                      <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{el.count}x</p>
                  <p className="text-xs text-muted-foreground">{el.unique_visitors} bezoekers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
