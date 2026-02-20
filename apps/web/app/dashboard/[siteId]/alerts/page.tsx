'use client';

import { use, useEffect, useState } from 'react';

interface Alert {
  id: string;
  type: 'traffic_drop' | 'traffic_spike' | 'goal_not_met' | 'error_spike' | 'uptime';
  name: string;
  threshold: number;
  notify_email: string;
  notify_slack_url: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

const alertTypes = [
  { value: 'traffic_drop', label: 'Verkeersdaling', description: 'Melding wanneer verkeer onder drempel % daalt' },
  { value: 'traffic_spike', label: 'Verkeersstijging', description: 'Melding wanneer verkeer boven drempel % stijgt' },
  { value: 'goal_not_met', label: 'Doel niet behaald', description: 'Melding wanneer dagelijkse doelconversies onder drempel liggen' },
  { value: 'error_spike', label: 'Foutpiek', description: 'Melding wanneer JS-fouten boven drempelaantal stijgen' },
  { value: 'uptime', label: 'Uptime-monitor', description: 'Melding wanneer site onbereikbaar is' },
] as const;

export default function AlertsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: 'traffic_drop', name: '', threshold: 50, notify_email: '', notify_slack_url: '' });
  const [creating, setCreating] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`/api/alerts?site_id=${siteId}`)
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchAlerts, [siteId]);

  const handleCreate = async () => {
    setCreating(true);
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, site_id: siteId, notify_slack_url: form.notify_slack_url || undefined }),
    });
    setShowCreate(false);
    setForm({ type: 'traffic_drop', name: '', threshold: 50, notify_email: '', notify_slack_url: '' });
    setCreating(false);
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    fetchAlerts();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meldingen</h1>
          <p className="text-sm text-muted-foreground">Ontvang meldingen wanneer statistieken veranderen</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nieuwe melding
        </button>
      </div>

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
          <button
            onClick={handleCreate}
            disabled={!form.name || !form.notify_email || creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Aanmaken...' : 'Melding aanmaken'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Geen meldingen geconfigureerd</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Maak meldingen aan om op de hoogte te worden gebracht van verkeersdalingen, foutpieken en meer.
          </p>
        </div>
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
                <button
                  onClick={() => handleDelete(a.id)}
                  className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
