'use client';

import { use, useState } from 'react';
import { useCrud } from '@/hooks/use-crud';
import { api } from '@/lib/api';
import { LoadingState, EmptyState, PageHeader, PrimaryButton, DeleteButton } from '@/components/shared';
import type { SharedReport } from '@/types';

export default function ReportsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { items: reports, loading, createItem, fetchItems } = useCrud<SharedReport>('/api/reports', siteId, 'reports');

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await createItem({ name, password: password || undefined, show_ai_insights: showAI });
    setName('');
    setPassword('');
    setShowAI(false);
    setShowCreate(false);
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/reports/${id}`);
    fetchItems();
  };

  const toggleAI = async (report: SharedReport) => {
    await api.patch(`/api/reports/${report.id}`, { show_ai_insights: !report.show_ai_insights });
    fetchItems();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/report/${token}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gedeelde rapporten"
        description="Maak en beheer openbare rapportlinks"
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)}>
            Nieuw rapport
          </PrimaryButton>
        }
      />

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-medium">Gedeeld rapport aanmaken</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Rapportnaam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maandelijks overzicht"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Wachtwoord (optioneel)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laat leeg voor geen wachtwoord"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAI}
              onChange={(e) => setShowAI(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            AI-inzichten toevoegen
          </label>
          <PrimaryButton onClick={handleCreate} disabled={!name || creating}>
            {creating ? 'Aanmaken...' : 'Rapport aanmaken'}
          </PrimaryButton>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : reports.length === 0 ? (
        <EmptyState
          title="Nog geen gedeelde rapporten"
          description="Maak een gedeeld rapport om klanten of stakeholders een openbare link te geven."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  Aangemaakt {new Date(r.created_at).toLocaleDateString()}
                  {r.password_protected && ' · 🔒 Wachtwoord beveiligd'}
                  {r.show_ai_insights && ' · ✨ AI-inzichten'}
                  {r.expires_at && ` · Verloopt ${new Date(r.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAI(r)}
                  className={`rounded-md border px-3 py-1.5 text-xs hover:bg-muted ${
                    r.show_ai_insights ? 'border-purple-300 bg-purple-50 text-purple-700' : ''
                  }`}
                >
                  {r.show_ai_insights ? 'AI aan' : 'AI uit'}
                </button>
                <button
                  onClick={() => copyLink(r.token)}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Link kopiëren
                </button>
                <a
                  href={`/report/${r.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Bekijken
                </a>
                <DeleteButton onClick={() => handleDelete(r.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
