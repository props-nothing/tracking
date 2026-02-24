'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, PageHeader } from '@/components/shared';
import type { OverviewStats } from '@/types';

export default function ReferrersPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<OverviewStats>(siteId, queryString);

  return (
    <div className="space-y-8">
      <PageHeader title="Verwijzers" description="Verkeersbronnen en UTM-campagnes" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <DataTable
            title="Topverwijzers"
            columns={[
              { key: 'source', label: 'Bron' },
              { key: 'count', label: 'Bezoeken', align: 'right' },
            ]}
            data={data?.top_referrers || []}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <DataTable
              title="UTM-bronnen"
              columns={[
                { key: 'source', label: 'Bron' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.utm_sources || []}
            />
            <DataTable
              title="UTM-media"
              columns={[
                { key: 'medium', label: 'Medium' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.utm_mediums || []}
            />
            <DataTable
              title="UTM-campagnes"
              columns={[
                { key: 'campaign', label: 'Campagne' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={data?.utm_campaigns || []}
            />
          </div>
        </>
      )}
    </div>
  );
}
