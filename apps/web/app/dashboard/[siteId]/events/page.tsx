'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { DataTable } from '@/components/tables/data-table';

interface EventRow {
  event_name: string;
  count: number;
  unique_visitors: number;
}

export default function EventsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<{
    event_name: string;
    event_data: Record<string, unknown>;
    timestamp: string;
    path: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}&metric=events`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.custom_events || []);
        setRecentEvents(data.recent_events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Events</h1>
          <p className="text-sm text-muted-foreground">Custom events fired via tracking API</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <DataTable
            title="Event Summary"
            columns={[
              { key: 'event_name', label: 'Event' },
              { key: 'count', label: 'Total', align: 'right' },
              { key: 'unique_visitors', label: 'Unique', align: 'right' },
            ]}
            data={events}
          />

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Recent Events</h2>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom events yet. Use <code className="rounded bg-muted px-1 text-xs">window.tracking.event(&quot;name&quot;, data)</code> to send events.</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((evt, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted px-4 py-2 text-sm">
                    <div>
                      <span className="font-medium">{evt.event_name}</span>
                      <span className="ml-2 text-muted-foreground">{evt.path}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
