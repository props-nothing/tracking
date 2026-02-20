'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { DataTable } from '@/components/tables/data-table';

interface PageData {
  path: string;
  count: number;
  unique_visitors: number;
  avg_time: number;
  bounce_rate: number;
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

export default function PagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [pages, setPages] = useState<PageData[]>([]);
  const [entryPages, setEntryPages] = useState<{ path: string; count: number }[]>([]);
  const [exitPages, setExitPages] = useState<{ path: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setPages(data.top_pages || []);
        setEntryPages(data.entry_pages || []);
        setExitPages(data.exit_pages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagina's</h1>
          <p className="text-sm text-muted-foreground">Toppagina's, instappagina's en uitstappagina's</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
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
            data={pages.map((p) => ({
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
              data={entryPages}
            />

            <DataTable
              title="Uitstappagina's"
              columns={[
                { key: 'path', label: 'Pagina' },
                { key: 'count', label: 'Uitstappen', align: 'right' as const },
              ]}
              data={exitPages}
            />
          </div>
        </>
      )}
    </div>
  );
}
