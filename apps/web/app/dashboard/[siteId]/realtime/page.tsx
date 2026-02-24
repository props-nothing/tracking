'use client';

import { use } from 'react';
import { useRealtimeVisitors } from '@/hooks/use-realtime-visitors';
import { PageHeader } from '@/components/shared';

export default function RealtimePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { count, pages, loading } = useRealtimeVisitors(siteId);

  return (
    <div className="space-y-8">
      <PageHeader title="Realtime" description="Live bezoekersactiviteit" />

      {/* Active count */}
      <div className="flex items-center gap-4 rounded-lg border bg-card p-8">
        <div className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
        </div>
        <div>
          <p className="text-4xl font-bold">{loading ? '—' : count}</p>
          <p className="text-sm text-muted-foreground">actieve bezoeker{count !== 1 ? 's' : ''} op dit moment</p>
        </div>
      </div>

      {/* Active pages */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium">Bekijken momenteel</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen actieve bezoekers</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(
              pages.reduce<Record<string, number>>((acc, p) => {
                acc[p.path] = (acc[p.path] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([path, visitors]) => (
                <div key={path} className="flex items-center justify-between rounded-md bg-muted px-4 py-2">
                  <span className="text-sm font-mono">{path}</span>
                  <span className="text-sm font-medium">{visitors} bezoeker{visitors !== 1 ? 's' : ''}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
