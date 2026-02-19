'use client';

import { use, useEffect, useState } from 'react';
import { TimeSeries } from '@/components/charts/time-series';

interface EmbedData {
  visitors: number;
  pageviews: number;
  timeseries: { date: string; visitors: number; pageviews: number }[];
}

export default function EmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<EmbedData | null>(null);

  useEffect(() => {
    fetch(`/api/reports/shared/${token}/data?format=embed`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [token]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Visitors</p>
          <p className="text-xl font-bold">{data.visitors.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pageviews</p>
          <p className="text-xl font-bold">{data.pageviews.toLocaleString()}</p>
        </div>
      </div>
      {data.timeseries && data.timeseries.length > 0 && (
        <TimeSeries data={data.timeseries} />
      )}
  
    </div>
  );
}
