'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface PageTime {
  path: string;
  avg_time_ms: number;
  avg_engaged_ms: number;
  visitors: number;
}

interface TimeOnPageData {
  overall_avg_time_ms: number;
  overall_avg_engaged_ms: number;
  pages: PageTime[];
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins < 60) return `${mins}m ${rem}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function TimeOnPagePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<TimeOnPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=time_on_page`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;

  if (!data || data.pages.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time on Page</h1>
          <p className="text-sm text-muted-foreground">How long visitors spend on each page</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Time on page is tracked automatically when visitors navigate between pages.
          </p>
        </div>
      </div>
    );
  }

  const engagementRatio = data.overall_avg_time_ms > 0
    ? Math.round((data.overall_avg_engaged_ms / data.overall_avg_time_ms) * 100)
    : 0;

  const tableData = data.pages.map((p) => ({
    ...p,
    avg_time_fmt: formatDuration(p.avg_time_ms),
    avg_engaged_fmt: formatDuration(p.avg_engaged_ms),
    engagement_pct:
      p.avg_time_ms > 0
        ? `${Math.round((p.avg_engaged_ms / p.avg_time_ms) * 100)}%`
        : '—',
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time on Page</h1>
        <p className="text-sm text-muted-foreground">Total time, active engagement, and per-page breakdowns</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Avg. Time on Page" value={formatDuration(data.overall_avg_time_ms)} />
        <MetricCard title="Avg. Engaged Time" value={formatDuration(data.overall_avg_engaged_ms)} />
        <MetricCard title="Engagement Ratio" value={`${engagementRatio}%`} />
        <MetricCard title="Pages Tracked" value={data.pages.length.toString()} />
      </div>

      {/* Visual engagement bar */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">Overall Engagement</h2>
        <div className="flex items-center gap-4">
          <div className="h-4 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${engagementRatio}%` }}
            />
          </div>
          <span className="text-sm font-medium">{engagementRatio}% active</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Engaged time measures active interaction (scrolling, clicking, typing) vs idle or background tab time.
        </p>
      </div>

      <DataTable
        title="Time per Page"
        columns={[
          { key: 'path', label: 'Page' },
          { key: 'avg_time_fmt', label: 'Avg. Time', align: 'right' as const },
          { key: 'avg_engaged_fmt', label: 'Engaged Time', align: 'right' as const },
          { key: 'engagement_pct', label: 'Engagement', align: 'right' as const },
          { key: 'visitors', label: 'Visitors', align: 'right' as const, sortable: true },
        ]}
        data={tableData}
        searchable
      />
    </div>
  );
}
