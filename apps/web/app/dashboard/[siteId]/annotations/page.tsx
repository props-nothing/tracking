'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';

interface Annotation {
  id: string;
  text: string;
  date: string;
  created_by: string;
  created_at: string;
}

export default function AnnotationsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  const fetchAnnotations = () => {
    setLoading(true);
    fetch(`/api/annotations?site_id=${siteId}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setAnnotations(d.annotations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchAnnotations, [siteId, period]);

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
          <h1 className="text-2xl font-bold tracking-tight">Annotations</h1>
          <p className="text-sm text-muted-foreground">Mark important events on your analytics timeline</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker period={period} onPeriodChange={setPeriod} />
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Annotation
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Note</label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="New marketing campaign launched"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!text || creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Saving...' : 'Save Annotation'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : annotations.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No annotations yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add annotations to mark deployments, campaigns, or other events on your charts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {new Date(a.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
