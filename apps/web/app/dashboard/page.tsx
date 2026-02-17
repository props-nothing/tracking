'use client';

import { useState } from 'react';
import { useSites, Site } from '@/hooks/use-site';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        <div className="text-sm text-muted-foreground">Loading sites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Select a site to view analytics</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add site
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border bg-card p-6 space-y-4 max-w-md">
          <h2 className="text-lg font-semibold">Add a new site</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Site name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="My Website"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
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
              {creating ? 'Creating...' : 'Create site'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sites.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">No sites yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first site to start tracking visitors.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/dashboard/${site.id}`}
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
            >
              <h3 className="font-semibold">{site.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{site.domain}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {site.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
