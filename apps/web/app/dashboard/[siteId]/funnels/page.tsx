'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { Funnel } from '@/types';

export default function FunnelsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/funnels?site_id=${siteId}`)
      .then((res) => res.json())
      .then((data) => {
        setFunnels(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Funnels"
        description="Meerstaps-conversiefunnels"
        action={
          <Link
            href={`/dashboard/${siteId}/funnels/new`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nieuwe funnel
          </Link>
        }
      />

      {funnels.length === 0 ? (
        <EmptyState
          title="Nog geen funnels"
          description="Maak een funnel om meerstaps-conversiestromen te analyseren."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {funnels.map((funnel) => (
            <Link
              key={funnel.id}
              href={`/dashboard/${siteId}/funnels/${funnel.id}`}
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{funnel.name}</h3>
              {funnel.description && <p className="mt-1 text-xs text-muted-foreground">{funnel.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{funnel.steps.length} stappen</span>
                <span>&middot;</span>
                <span>{funnel.steps.map((s) => s.name).join(' → ')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
