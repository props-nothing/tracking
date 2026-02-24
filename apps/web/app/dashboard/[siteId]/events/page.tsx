'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, PageHeader } from '@/components/shared';
import type { EventsData } from '@/types';

export default function EventsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<EventsData>(siteId, queryString, 'events');

  return (
    <div className="space-y-8">
      <PageHeader title="Aangepaste events" description="Aangepaste events via de tracking-API" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <DataTable
            title="Eventoverzicht"
            columns={[
              { key: 'event_name', label: 'Event' },
              { key: 'count', label: 'Totaal', align: 'right' },
              { key: 'unique_visitors', label: 'Uniek', align: 'right' },
            ]}
            data={data?.custom_events || []}
          />

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Recente events</h2>
            {!data?.recent_events?.length ? (
              <p className="text-sm text-muted-foreground">Nog geen aangepaste events. Use <code className="rounded bg-muted px-1 text-xs">window.tracking.event(&quot;name&quot;, data)</code> to send events.</p>
            ) : (
              <div className="space-y-2">
                {data.recent_events.map((evt, i) => (
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
