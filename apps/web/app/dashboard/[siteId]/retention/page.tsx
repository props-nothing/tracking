'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { RetentionMatrix } from '@/components/charts/retention-matrix';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { CohortData } from '@/types';

interface RetentionData {
  cohorts: CohortData[];
}

export default function RetentionPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<RetentionData>(siteId, queryString, 'retention');

  if (loading) return <LoadingState />;

  const cohorts = data?.cohorts || [];

  return (
    <div className="space-y-8">
      <PageHeader title="Retentie" description="Cohortanalyse terugkerende bezoekers" />

      {cohorts.length === 0 ? (
        <EmptyState
          title="Retentieanalyse"
          description="Retentie-cohortdata vereist minimaal 2 weken aan trackingdata om betekenisvolle resultaten te genereren."
        />
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Wekelijkse cohortretentie</h2>
          <RetentionMatrix cohorts={cohorts} />
        </div>
      )}
    </div>
  );
}
