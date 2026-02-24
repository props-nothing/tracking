'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { ErrorsData } from '@/types';

export default function ErrorsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<ErrorsData>(siteId, queryString, 'errors');

  return (
    <div className="space-y-8">
      <PageHeader title="JS-fouten" description="JavaScript-foutopsporing" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard title="Totaal fouten" value={(data?.total_errors ?? 0).toString()} />
            <MetricCard title="Unieke fouten" value={(data?.errors?.length ?? 0).toString()} />
          </div>

          {!data?.errors?.length ? (
            <EmptyState
              title="Geen fouten vastgelegd"
              description="Schakel foutopsporing in met data-track-errors=&quot;true&quot;"
            />
          ) : (
            <div className="space-y-3">
              {data.errors.map((err, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-red-600">
                        {err.error_message}
                      </p>
                      {err.error_source && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {err.error_source}{err.error_line ? `:${err.error_line}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{err.count}x</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(err.last_seen).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
