'use client';

import { use, useState } from 'react';
import { useCrud } from '@/hooks/use-crud';
import { LoadingState, EmptyState, PageHeader, PrimaryButton } from '@/components/shared';
import type { ApiKey } from '@/types';

const availableScopes = ['read:stats', 'read:events', 'write:events', 'read:sites', 'write:sites', 'read:goals', 'write:goals'];

export default function ApiKeysPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { items: keys, loading, createItem, deleteItem } = useCrud<ApiKey>('/api/api-keys', siteId, 'keys');

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:stats']);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    const data = await createItem({ name, scopes }) as Record<string, unknown>;
    setNewKey((data?.key as string) || null);
    setCreating(false);
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="API-sleutels"
        description="Beheer API-sleutels voor programmatische toegang"
        action={
          <PrimaryButton onClick={() => { setShowCreate(!showCreate); setNewKey(null); }}>
            Sleutel aanmaken
          </PrimaryButton>
        }
      />

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
          <PrimaryButton onClick={handleCreate} disabled={!name || scopes.length === 0 || creating}>
            {creating ? 'Aanmaken...' : 'Sleutel genereren'}
          </PrimaryButton>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : keys.length === 0 && !showCreate ? (
        <EmptyState
          title="Geen API-sleutels"
          description="Maak API-sleutels aan om programmatisch toegang te krijgen tot je analysegegevens."
        />
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
                onClick={() => deleteItem(k.id)}
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
