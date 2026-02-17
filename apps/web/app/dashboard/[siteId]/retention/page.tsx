'use client';

import { use, useEffect, useState } from 'react';
import { RetentionMatrix } from '@/components/charts/retention-matrix';

interface CohortData {
  label: string;
  total: number;
  periods: number[];
}

export default function RetentionPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch retention data from stats API
    fetch(`/api/stats?site_id=${siteId}&period=last_90_days&metric=retention`)
      .then((res) => res.json())
      .then((data) => {
        setCohorts(data.cohorts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retention</h1>
        <p className="text-sm text-muted-foreground">Returning visitor cohort analysis</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : cohorts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Retention Analysis</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Retention cohort data requires at least 2 weeks of tracking data to generate meaningful results.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium">Weekly Cohort Retention</h2>
          <RetentionMatrix cohorts={cohorts} />
        </div>
      )}
    </div>
  );
}
