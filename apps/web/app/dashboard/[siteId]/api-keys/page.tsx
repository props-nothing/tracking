'use client';

import { use, useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeysPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:stats']);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const availableScopes = ['read:stats', 'read:events', 'write:events', 'read:sites', 'write:sites', 'read:goals', 'write:goals'];

  const fetchKeys = () => {
    setLoading(true);
    fetch(`/api/api-keys?site_id=${siteId}`)
      .then((r) => r.json())
      .then((d) => {
        setKeys(d.keys || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchKeys, [siteId]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, name, scopes }),
    });
    const data = await res.json();
    setNewKey(data.key || null);
    setCreating(false);
    fetchKeys();
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API-sleutels</h1>
          <p className="text-sm text-muted-foreground">Beheer API-sleutels voor programmatische toegang</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setNewKey(null); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sleutel aanmaken
        </button>
      </div>

      {newKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">API-sleutel aangemaakt — kopieer deze nu, hij wordt niet opnieuw getoond:</p>
          <code className="mt-2 block rounded bg-white px-3 py-2 font-mono text-sm break-all">{newKey}</code>
        </div>
      )}

      {showCreate && !newKey && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Sleutelnaam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CI/CD Pipeline"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((scope) => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${scopes.includes(scope) ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name || scopes.length === 0 || creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Aanmaken...' : 'Sleutel genereren'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : keys.length === 0 && !showCreate ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Geen API-sleutels</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Maak API-sleutels aan om programmatisch toegang te krijgen tot je analysegegevens.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1">{k.prefix}••••••••</code>
                  {' · '}{k.scopes.join(', ')}
                  {k.last_used_at && ` · Laatst gebruikt ${new Date(k.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Intrekken
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
