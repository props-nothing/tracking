'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { DataTable } from '@/components/tables/data-table';
import { BarChart } from '@/components/charts/bar-chart';
import { LoadingState, PageHeader } from '@/components/shared';
import type { OverviewStats } from '@/types';

export default function GeoPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<OverviewStats>(siteId, queryString);

  return (
    <div className="space-y-8">
      <PageHeader title="Geografie" description="Bezoekers per locatie" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Toplanden</h2>
            <BarChart
              data={(data?.top_countries || []).slice(0, 10).map((c) => ({ name: c.country, value: c.count }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Landen"
              columns={[
                { key: 'country', label: 'Land' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.top_countries || []}
            />

            <DataTable
              title="Steden"
              columns={[
                { key: 'city', label: 'Stad' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.top_cities || []}
            />
          </div>
        </>
      )}
    </div>
  );
}
