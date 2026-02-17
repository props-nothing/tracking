'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { DataTable } from '@/components/tables/data-table';

interface PageData {
  path: string;
  count: number;
  unique_visitors: number;
  avg_time: number;
  bounce_rate: number;
}

export default function PagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [pages, setPages] = useState<PageData[]>([]);
  const [entryPages, setEntryPages] = useState<{ path: string; count: number }[]>([]);
  const [exitPages, setExitPages] = useState<{ path: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setPages(data.top_pages || []);
        setEntryPages(data.entry_pages || []);
        setExitPages(data.exit_pages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="text-sm text-muted-foreground">Top pages, entry pages, and exit pages</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <DataTable
            title="All Pages"
            columns={[
              { key: 'path', label: 'Page' },
              { key: 'count', label: 'Views', align: 'right' as const },
              { key: 'unique_visitors', label: 'Unique Visitors', align: 'right' as const },
              { key: 'avg_time', label: 'Avg. Time (ms)', align: 'right' as const },
              { key: 'bounce_rate', label: 'Bounce %', align: 'right' as const },
            ]}
            data={pages}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Entry Pages"
              columns={[
                { key: 'path', label: 'Page' },
                { key: 'count', label: 'Entries', align: 'right' as const },
              ]}
              data={entryPages}
            />

            <DataTable
              title="Exit Pages"
              columns={[
                { key: 'path', label: 'Page' },
                { key: 'count', label: 'Exits', align: 'right' as const },
              ]}
              data={exitPages}
            />
          </div>
        </>
      )}
    </div>
  );
}
