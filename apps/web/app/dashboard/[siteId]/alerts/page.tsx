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
  { value: 'traffic_drop', label: 'Traffic Drop', description: 'Alert when traffic drops below threshold %' },
  { value: 'traffic_spike', label: 'Traffic Spike', description: 'Alert when traffic exceeds threshold %' },
  { value: 'goal_not_met', label: 'Goal Not Met', description: 'Alert when daily goal conversions below threshold' },
  { value: 'error_spike', label: 'Error Spike', description: 'Alert when JS errors exceed threshold count' },
  { value: 'uptime', label: 'Uptime Monitor', description: 'Alert when site is unreachable' },
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
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">Get notified when metrics change</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Alert
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-medium">Create Alert</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Alert Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Traffic alert"
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
            <label className="mb-1 block text-xs text-muted-foreground">Threshold</label>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Notification Email</label>
            <input
              type="email"
              value={form.notify_email}
              onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Slack Webhook (optional)</label>
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
            {creating ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No alerts configured</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create alerts to be notified of traffic drops, error spikes, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {alertTypes.find((t) => t.value === a.type)?.label} · Threshold: {a.threshold}
                  {a.last_triggered_at && ` · Last triggered: ${new Date(a.last_triggered_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {a.enabled ? 'Active' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
