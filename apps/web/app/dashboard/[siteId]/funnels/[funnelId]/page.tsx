'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { FunnelChart } from '@/components/charts/funnel-chart';

interface FunnelData {
  funnel: { id: string; name: string; description: string; steps: { name: string }[] };
  steps: { name: string; count: number; dropoff: number; conversion_rate: number }[];
}

export default function FunnelDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; funnelId: string }>;
}) {
  const { siteId, funnelId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/funnels/${funnelId}/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [funnelId, siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data?.funnel.name || 'Funnel'}</h1>
          <p className="text-sm text-muted-foreground">{data?.funnel.description}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : data ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-6 text-sm font-medium">Funnelvisualisatie</h2>
          <FunnelChart steps={data.steps} />

          {data.steps.length > 0 && (
            <div className="mt-6 rounded-md bg-muted p-4 text-sm">
              <p>
                <strong>Totaal conversiepercentage:</strong>{' '}
                {data.steps.length >= 2
                  ? `${Math.round((data.steps[data.steps.length - 1].count / Math.max(data.steps[0].count, 1)) * 100)}%`
                  : '—'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center text-sm text-muted-foreground">Funnel niet gevonden</div>
      )}
    </div>
  );
}
