'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
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
  const { period, setPeriod } = useDateRange();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/funnels/${funnelId}/stats?site_id=${siteId}&period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [funnelId, siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data?.funnel.name || 'Funnel'}</h1>
          <p className="text-sm text-muted-foreground">{data?.funnel.description}</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : data ? (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-6 text-sm font-medium">Funnel Visualization</h2>
          <FunnelChart steps={data.steps} />

          {data.steps.length > 0 && (
            <div className="mt-6 rounded-md bg-muted p-4 text-sm">
              <p>
                <strong>Overall conversion rate:</strong>{' '}
                {data.steps.length >= 2
                  ? `${Math.round((data.steps[data.steps.length - 1].count / Math.max(data.steps[0].count, 1)) * 100)}%`
                  : '—'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center text-sm text-muted-foreground">Funnel not found</div>
      )}
    </div>
  );
}
