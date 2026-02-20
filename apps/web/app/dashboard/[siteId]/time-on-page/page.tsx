'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface PageTime {
  path: string;
  avg_time_on_page: number;
  avg_engaged_time: number;
  unique_visitors: number;
}

interface TimeOnPageData {
  avg_time_on_page: number;
  avg_engaged_time: number;
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

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>;

  if (!data || data.pages.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tijd op pagina</h1>
          <p className="text-sm text-muted-foreground">Hoe lang bezoekers op elke pagina doorbrengen</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Nog geen data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tijd op pagina wordt automatisch bijgehouden wanneer bezoekers tussen pagina's navigeren.
          </p>
        </div>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tijd op pagina</h1>
        <p className="text-sm text-muted-foreground">Totale tijd, actieve betrokkenheid en uitsplitsing per pagina</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Gem. tijd op pagina" value={formatDuration(data.avg_time_on_page)} />
        <MetricCard title="Gem. actieve tijd" value={formatDuration(data.avg_engaged_time)} />
        <MetricCard title="Betrokkenheidsratio" value={`${engagementRatio}%`} />
        <MetricCard title="Gevolgde pagina's" value={data.pages.length.toString()} />
      </div>

      {/* Visual engagement bar */}
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
