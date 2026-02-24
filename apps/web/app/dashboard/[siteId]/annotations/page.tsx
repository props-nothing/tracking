'use client';

import { use, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useCrud } from '@/hooks/use-crud';
import { LoadingState, EmptyState, PageHeader, PrimaryButton, DeleteButton } from '@/components/shared';
import type { Annotation } from '@/types';

export default function AnnotationsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { items: annotations, loading, createItem, deleteItem } = useCrud<Annotation>('/api/annotations', siteId, 'annotations', queryString);

  const [showCreate, setShowCreate] = useState(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await createItem({ text, date });
    setText('');
    setShowCreate(false);
    setCreating(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Annotaties"
        description="Markeer belangrijke gebeurtenissen op je analysetijdlijn"
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)}>
            Annotatie toevoegen
          </PrimaryButton>
        }
      />

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
          <PrimaryButton onClick={handleCreate} disabled={!text || creating}>
            {creating ? 'Opslaan...' : 'Annotatie opslaan'}
          </PrimaryButton>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : annotations.length === 0 ? (
        <EmptyState
          title="Nog geen annotaties"
          description="Voeg annotaties toe om implementaties, campagnes of andere gebeurtenissen op je grafieken te markeren."
        />
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
              <DeleteButton onClick={() => deleteItem(a.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
