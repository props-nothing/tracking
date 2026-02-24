'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { Data404 } from '@/types';

export default function NotFoundPagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<Data404>(siteId, queryString, '404s');

  if (loading) return <LoadingState />;

  if (!data || data.total_404s === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="404-pagina's" description="Pagina's die een &quot;Niet gevonden&quot;-fout gaven" />
        <EmptyState
          title="Geen 404-fouten gevonden"
          description="404-pagina's worden automatisch gevolgd wanneer je site een aangepast &quot;404&quot;-event verstuurt."
        />
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
      <PageHeader title="404-pagina's" description="Gebroken links en ontbrekende pagina's" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Totaal 404-hits" value={data.total_404s.toLocaleString()} />
        <MetricCard title="Unieke 404-pagina's" value={(data.unique_404_pages ?? data.pages.length).toLocaleString()} />
        <MetricCard
          title="Gem. hits per pagina"
          value={data.pages.length > 0 ? (data.total_404s / data.pages.length).toFixed(1) : '0'}
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
