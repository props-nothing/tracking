'use client';

import { useState } from 'react';
import { useSites, Site } from '@/hooks/use-site';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteCard } from '@/components/site-card';

export default function DashboardPage() {
  const { sites, loading } = useSites();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain }),
    });
    if (res.ok) {
      const site = await res.json();
      router.push(`/dashboard/${site.id}`);
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Sites laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Selecteer een site om analyses te bekijken</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Site toevoegen
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border bg-card p-6 space-y-4 max-w-md">
          <h2 className="text-lg font-semibold">Nieuwe site toevoegen</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sitenaam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Mijn website"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Domein</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="example.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? 'Aanmaken...' : 'Site aanmaken'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {sites.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">Nog geen sites</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Voeg je eerste site toe om bezoekers te volgen.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  );
}
