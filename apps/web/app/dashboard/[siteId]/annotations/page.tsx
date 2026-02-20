'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';

interface Annotation {
  id: string;
  text: string;
  date: string;
  created_by: string;
  created_at: string;
}

export default function AnnotationsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, queryString } = useDashboard();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  const fetchAnnotations = () => {
    setLoading(true);
    fetch(`/api/annotations?site_id=${siteId}&${queryString}`)
      .then((r) => r.json())
      .then((d) => {
        setAnnotations(d.annotations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchAnnotations, [siteId, queryString]);

  const handleCreate = async () => {
    setCreating(true);
    await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, text, date }),
    });
    setText('');
    setShowCreate(false);
    setCreating(false);
    fetchAnnotations();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/annotations?id=${id}`, { method: 'DELETE' });
    fetchAnnotations();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Annotaties</h1>
          <p className="text-sm text-muted-foreground">Markeer belangrijke gebeurtenissen op je analysetijdlijn</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Annotatie toevoegen
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Notitie</label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nieuwe marketingcampagne gelanceerd"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!text || creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Opslaan...' : 'Annotatie opslaan'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : annotations.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Nog geen annotaties</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Voeg annotaties toe om implementaties, campagnes of andere gebeurtenissen op je grafieken te markeren.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {new Date(a.date).toLocaleDateString('nl', { month: 'short', day: 'numeric' })}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Toegevoegd {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Verwijderen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
