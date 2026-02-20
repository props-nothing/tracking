'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface NotFoundPage {
  path: string;
  hits: number;
  unique_visitors: number;
  referrers: string[];
  last_seen: string;
}

interface Data404 {
  total_404s: number;
  unique_pages: number;
  pages: NotFoundPage[];
}

export default function NotFoundPagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<Data404 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=404s`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>;

  if (!data || data.total_404s === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">404-pagina's</h1>
          <p className="text-sm text-muted-foreground">Pagina's die een "Niet gevonden"-fout gaven</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Geen 404-fouten gevonden</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            404-pagina's worden automatisch gevolgd wanneer je site een aangepast "404"-event verstuurt.
          </p>
        </div>
      </div>
    );
  }

  const tableData = data.pages.map((p) => ({
    ...p,
    referrer_list: p.referrers.length > 0 ? p.referrers.join(', ') : '(direct)',
    last_seen_fmt: new Date(p.last_seen).toLocaleDateString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">404-pagina's</h1>
        <p className="text-sm text-muted-foreground">Gebroken links en ontbrekende pagina's</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Totaal 404-hits" value={data.total_404s.toLocaleString()} />
        <MetricCard title="Unieke 404-pagina's" value={data.unique_pages.toLocaleString()} />
        <MetricCard
          title="Gem. hits per pagina"
          value={data.unique_pages > 0 ? (data.total_404s / data.unique_pages).toFixed(1) : '0'}
        />
      </div>

      <DataTable
        title="404-pagina's"
        columns={[
          { key: 'path', label: 'Paginapad' },
          { key: 'hits', label: 'Hits', align: 'right' as const, sortable: true },
          { key: 'unique_visitors', label: 'Bezoekers', align: 'right' as const, sortable: true },
          { key: 'referrer_list', label: 'Verwijzers' },
          { key: 'last_seen_fmt', label: 'Laatst gezien', align: 'right' as const },
        ]}
        data={tableData}
        searchable
      />

      {/* Quick fix suggestions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">Hersteltips</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Controleer op gebroken interne links op pagina's die naar deze URL's verwijzen</li>
          <li>• Stel 301-omleidingen in voor hernoemde of verplaatste pagina's</li>
          <li>• Bekijk verwijzerbronnen om te vinden waar bezoekers gebroken links volgen</li>
          <li>• Overweeg een behulpzame aangepaste 404-pagina met zoekfunctie of navigatie toe te voegen</li>
        </ul>
      </div>
    </div>
  );
}
