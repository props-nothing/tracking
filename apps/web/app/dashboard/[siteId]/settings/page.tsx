'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { LoadingState, PageHeader, PrimaryButton } from '@/components/shared';
import type { SiteSettings } from '@/types';

export default function SettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSite = useCallback(() => {
    setLoading(true);
    api.get<SiteSettings>(`/api/sites/${siteId}`)
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
    try {
      await api.patch(`/api/sites/${siteId}`, {
        name: site.name,
        domain: site.domain,
        timezone: site.timezone,
        public: site.public,
        allowed_origins: site.allowed_origins,
      });
      setMessage('Instellingen opgeslagen!');
    } catch {
      setMessage('Instellingen opslaan mislukt.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze site wilt verwijderen? Deze actie is onomkeerbaar.')) return;
    await api.delete(`/api/sites/${siteId}`);
    window.location.href = '/dashboard';
  };

  if (loading) return <LoadingState />;

  if (!site) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Site niet gevonden</div>;
  }

  const trackingSnippet = `<script defer data-site-id="${siteId}" src="${typeof window !== 'undefined' ? window.location.origin : ''}/t.js"></script>`;

  return (
    <div className="space-y-8">
      <PageHeader title="Instellingen" description="Beheer siteconfiguratie" />

      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h2 className="text-sm font-medium">Algemeen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Sitenaam</label>
            <input
              value={site.name}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Domein</label>
            <input
              value={site.domain}
              onChange={(e) => setSite({ ...site, domain: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tijdzone</label>
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
            <label htmlFor="public" className="text-sm">Openbaar dashboard</label>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Toegestane origins (kommagescheiden)</label>
          <input
            value={(site.allowed_origins || []).join(', ')}
            onChange={(e) => setSite({ ...site, allowed_origins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="https://example.com, https://www.example.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? 'Opslaan...' : 'Instellingen opslaan'}
          </PrimaryButton>
          {message && <span className="text-sm text-green-600">{message}</span>}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium">Trackingcode</h2>
        <p className="text-xs text-muted-foreground">Voeg dit fragment toe aan de <code>&lt;head&gt;</code> van je website:</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{trackingSnippet}</pre>
        <button
          onClick={() => navigator.clipboard.writeText(trackingSnippet)}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Kopiëren naar klembord
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-red-600">Gevarenzone</h2>
        <p className="text-xs text-muted-foreground">
          Verwijder deze site en alle bijbehorende gegevens permanent. Dit kan niet ongedaan gemaakt worden.
        </p>
        <button
          onClick={handleDelete}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Site verwijderen
        </button>
      </div>
    </div>
  );
}
