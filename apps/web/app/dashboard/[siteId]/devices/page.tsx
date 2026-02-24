'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { DataTable } from '@/components/tables/data-table';
import { PieChart } from '@/components/charts/pie-chart';
import { LoadingState, PageHeader } from '@/components/shared';
import type { OverviewStats } from '@/types';

export default function DevicesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<OverviewStats>(siteId, queryString);

  return (
    <div className="space-y-8">
      <PageHeader title="Apparaten" description="Browsers, besturingssystemen en apparaattypen" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Apparaattypen</h2>
            <PieChart
              data={(data?.top_devices || []).map((d) => ({ name: d.device, value: d.count }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Browsers"
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.top_browsers || []}
            />

            <DataTable
              title="Besturingssystemen"
              columns={[
                { key: 'os', label: 'OS' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.top_os || []}
            />
          </div>
        </>
      )}
    </div>
  );
}
