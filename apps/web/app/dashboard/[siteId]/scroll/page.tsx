'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface ScrollPage {
  path: string;
  sample_count: number;
  avg_depth: number;
  pct_reached_50: number;
  pct_reached_100: number;
}

interface ScrollData {
  avg_depth: number;
  sample_count: number;
  funnel: {
    reached_25: number;
    reached_50: number;
    reached_75: number;
    reached_100: number;
  };
  pages: ScrollPage[];
}

export default function ScrollDepthPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<ScrollData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=scroll_depth`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;

  if (!data || data.sample_count === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scroll Depth</h1>
          <p className="text-sm text-muted-foreground">How far visitors scroll on your pages</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No scroll data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Scroll depth is captured automatically on every pageview. Data appears once visitors browse.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scroll Depth</h1>
        <p className="text-sm text-muted-foreground">
          How far visitors scroll — {data.sample_count.toLocaleString()} samples
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Avg. Scroll Depth" value={`${data.avg_depth}%`} />
        <MetricCard title="Reached 25%" value={`${data.funnel.reached_25}%`} />
        <MetricCard title="Reached 50%" value={`${data.funnel.reached_50}%`} />
        <MetricCard title="Reached 75%" value={`${data.funnel.reached_75}%`} />
        <MetricCard title="Reached 100%" value={`${data.funnel.reached_100}%`} />
      </div>

      {/* Scroll funnel visualization */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium">Scroll Funnel</h2>
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

      {/* Pages sorted by lowest scroll depth */}
      <DataTable
        title="Pages by Scroll Depth (lowest first)"
        columns={[
          { key: 'path', label: 'Page' },
          { key: 'sample_count', label: 'Samples', align: 'right' as const },
          { key: 'avg_depth', label: 'Avg. Depth', align: 'right' as const, sortable: true },
          { key: 'pct_reached_50', label: '% Reached 50%', align: 'right' as const },
          { key: 'pct_reached_100', label: '% Reached 100%', align: 'right' as const },
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
