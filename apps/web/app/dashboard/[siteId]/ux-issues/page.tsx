'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface ClickElement {
  element_tag: string;
  element_text: string;
  count: number;
  unique_visitors: number;
  pages: string[];
}

interface IssuePage {
  path: string;
  rage_clicks: number;
  dead_clicks: number;
  total: number;
}

interface UXData {
  total_rage_clicks: number;
  total_dead_clicks: number;
  rage_click_elements: ClickElement[];
  dead_click_elements: ClickElement[];
  issue_pages: IssuePage[];
}

export default function UXIssuesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<UXData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=ux_issues`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>;

  if (!data || (data.total_rage_clicks === 0 && data.total_dead_clicks === 0)) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">UX-problemen</h1>
          <p className="text-sm text-muted-foreground">Rage-klikken en dead-klikken die frustratie aangeven</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Geen UX-problemen gedetecteerd</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Rage-klikken (3+ snelle klikken) en dead-klikken (klikken zonder reactie) worden automatisch gevolgd.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">UX-problemen</h1>
        <p className="text-sm text-muted-foreground">Rage-klikken, dead-klikken en frustratiesignalen</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Rage-klikken" value={data.total_rage_clicks.toLocaleString()} />
        <MetricCard title="Dead-klikken" value={data.total_dead_clicks.toLocaleString()} />
        <MetricCard title="Getroffen elementen" value={(data.rage_click_elements.length + data.dead_click_elements.length).toString()} />
        <MetricCard title="Getroffen pagina's" value={data.issue_pages.length.toString()} />
      </div>

      {/* Most-affected pages */}
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

      {/* Rage click elements */}
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

      {/* Dead click elements */}
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
