'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: { name: string }[];
  created_at: string;
}

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funnels</h1>
          <p className="text-sm text-muted-foreground">Meerstaps-conversiefunnels</p>
        </div>
        <Link
          href={`/dashboard/${siteId}/funnels/new`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nieuwe funnel
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : funnels.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Nog geen funnels</h3>
          <p className="mt-2 text-sm text-muted-foreground">Maak een funnel om meerstaps-conversiestromen te analyseren.</p>
          <Link
            href={`/dashboard/${siteId}/funnels/new`}
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Funnel aanmaken
          </Link>
        </div>
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
