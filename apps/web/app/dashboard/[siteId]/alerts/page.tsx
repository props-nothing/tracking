'use client';

import { use, useState } from 'react';
import { useCrud } from '@/hooks/use-crud';
import { LoadingState, EmptyState, PageHeader, PrimaryButton, DeleteButton } from '@/components/shared';
import type { Alert } from '@/types';

const alertTypes = [
  { value: 'traffic_drop', label: 'Verkeersdaling', description: 'Melding wanneer verkeer onder drempel % daalt' },
  { value: 'traffic_spike', label: 'Verkeersstijging', description: 'Melding wanneer verkeer boven drempel % stijgt' },
  { value: 'goal_not_met', label: 'Doel niet behaald', description: 'Melding wanneer dagelijkse doelconversies onder drempel liggen' },
  { value: 'error_spike', label: 'Foutpiek', description: 'Melding wanneer JS-fouten boven drempelaantal stijgen' },
  { value: 'uptime', label: 'Uptime-monitor', description: 'Melding wanneer site onbereikbaar is' },
] as const;

export default function AlertsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { items: alerts, loading, createItem, deleteItem } = useCrud<Alert>('/api/alerts', siteId, 'alerts');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: 'traffic_drop', name: '', threshold: 50, notify_email: '', notify_slack_url: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await createItem({ ...form, notify_slack_url: form.notify_slack_url || undefined });
    setShowCreate(false);
    setForm({ type: 'traffic_drop', name: '', threshold: 50, notify_email: '', notify_slack_url: '' });
    setCreating(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meldingen"
        description="Ontvang meldingen wanneer statistieken veranderen"
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)}>
            Nieuwe melding
          </PrimaryButton>
        }
      />

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-medium">Melding aanmaken</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Meldingsnaam</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Verkeersmelding"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Alert['type'] })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {alertTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Drempel</label>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Notificatie-e-mail</label>
            <input
              type="email"
              value={form.notify_email}
              onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Slack-webhook (optioneel)</label>
            <input
              value={form.notify_slack_url}
              onChange={(e) => setForm({ ...form, notify_slack_url: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <PrimaryButton onClick={handleCreate} disabled={!form.name || !form.notify_email || creating}>
            {creating ? 'Aanmaken...' : 'Melding aanmaken'}
          </PrimaryButton>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="Geen meldingen geconfigureerd"
          description="Maak meldingen aan om op de hoogte te worden gebracht van verkeersdalingen, foutpieken en meer."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {alertTypes.find((t) => t.value === a.type)?.label} · Drempel: {a.threshold}
                  {a.last_triggered_at && ` · Laatst geactiveerd: ${new Date(a.last_triggered_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {a.enabled ? 'Actief' : 'Uitgeschakeld'}
                </span>
                <DeleteButton onClick={() => deleteItem(a.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
