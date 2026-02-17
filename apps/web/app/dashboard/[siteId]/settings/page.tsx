'use client';

import { use, useEffect, useState, useCallback } from 'react';

interface SiteSettings {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  public: boolean;
  allowed_origins: string[];
}

export default function SettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSite = useCallback(() => {
    setLoading(true);
    fetch(`/api/sites/${siteId}`)
      .then((r) => r.json())
      .then((d) => {
        setSite(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  useEffect(fetchSite, [fetchSite]);

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/sites/${siteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: site.name,
        domain: site.domain,
        timezone: site.timezone,
        public: site.public,
        allowed_origins: site.allowed_origins,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Settings saved!' : 'Failed to save settings.');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this site? This action is irreversible.')) return;
    await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
    window.location.href = '/dashboard';
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!site) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Site not found</div>;
  }

  const trackingSnippet = `<script defer data-site-id="${siteId}" src="${typeof window !== 'undefined' ? window.location.origin : ''}/t.js"></script>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage site configuration</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h2 className="text-sm font-medium">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Site Name</label>
            <input
              value={site.name}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Domain</label>
            <input
              value={site.domain}
              onChange={(e) => setSite({ ...site, domain: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Timezone</label>
            <select
              value={site.timezone}
              onChange={(e) => setSite({ ...site, timezone: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              id="public"
              type="checkbox"
              checked={site.public}
              onChange={(e) => setSite({ ...site, public: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="public" className="text-sm">Public dashboard</label>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Allowed Origins (comma-separated)</label>
          <input
            value={(site.allowed_origins || []).join(', ')}
            onChange={(e) => setSite({ ...site, allowed_origins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="https://example.com, https://www.example.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium">Tracking Code</h2>
        <p className="text-xs text-muted-foreground">Add this snippet to the <code>&lt;head&gt;</code> of your website:</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{trackingSnippet}</pre>
        <button
          onClick={() => navigator.clipboard.writeText(trackingSnippet)}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Copy to clipboard
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-red-600">Danger Zone</h2>
        <p className="text-xs text-muted-foreground">
          Permanently delete this site and all associated data. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete Site
        </button>
      </div>
    </div>
  );
}
