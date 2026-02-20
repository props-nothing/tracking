'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { RetentionMatrix } from '@/components/charts/retention-matrix';

interface CohortData {
  label: string;
  total: number;
  periods: number[];
}

export default function RetentionPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch retention data from stats API
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=retention`)
      .then((res) => res.json())
      .then((data) => {
        setCohorts(data.cohorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Retentie</h1>
          <p className="text-sm text-muted-foreground">Cohortanalyse terugkerende bezoekers</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : cohorts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Retentieanalyse</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Retentie-cohortdata vereist minimaal 2 weken aan trackingdata om betekenisvolle resultaten te genereren.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Wekelijkse cohortretentie</h2>
          <RetentionMatrix cohorts={cohorts} />
        </div>
      )}
    </div>
  );
}
