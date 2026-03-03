'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSites } from '@/hooks/use-site';
import { LoadingState, PageHeader, PrimaryButton, DeleteButton } from '@/components/shared';

interface SharedDashboard {
  id: string;
  token: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  password_hash: string | null;
  created_at: string;
  shared_dashboard_sites: { id: string; site_id: string; report_token: string | null }[];
}

export default function PortalsPage() {
  const { sites, loading: sitesLoading } = useSites();
  const [dashboards, setDashboards] = useState<SharedDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSites, setEditSites] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchDashboards = useCallback(() => {
    setLoading(true);
    api
      .get<{ dashboards: SharedDashboard[] }>('/api/shared-dashboards')
      .then((d) => {
        setDashboards(d.dashboards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  // Only show sites the user owns (not member sites)
  const ownedSites = sites.filter((s) => s.role === 'owner' || s.role === 'admin');

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/api/shared-dashboards', {
        title,
        description: description || undefined,
        password: password || undefined,
        site_ids: selectedSites,
      });
      setTitle('');
      setDescription('');
      setPassword('');
      setSelectedSites([]);
      setShowCreate(false);
      fetchDashboards();
    } catch {}
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/shared-dashboards?id=${id}`);
    fetchDashboards();
  };

  const startEdit = (d: SharedDashboard) => {
    setEditing(d.id);
    setEditTitle(d.title);
    setEditDescription(d.description || '');
    setEditPassword('');
    setEditSites(d.shared_dashboard_sites.map((s) => s.site_id));
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch('/api/shared-dashboards', {
        id: editing,
        title: editTitle,
        description: editDescription || undefined,
        password: editPassword || undefined,
        site_ids: editSites,
      });
      setEditing(null);
      fetchDashboards();
    } catch {}
    setSaving(false);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
  };

  const toggleSite = (siteId: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(siteId) ? list.filter((id) => id !== siteId) : [...list, siteId]);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Portals"
        description="Maak gedeelde dashboards met meerdere sites — geen login vereist voor bezoekers"
        action={
          <PrimaryButton onClick={() => setShowCreate(!showCreate)}>
            Nieuw portal
          </PrimaryButton>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4 max-w-lg">
          <h2 className="text-sm font-medium">Nieuw client portal</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Titel</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Client Dashboard"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Beschrijving (optioneel)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dashboard voor Klant X"
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
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Sites selecteren</label>
            {sitesLoading ? (
              <p className="text-xs text-muted-foreground">Sites laden...</p>
            ) : ownedSites.length === 0 ? (
              <p className="text-xs text-muted-foreground">Geen sites beschikbaar. Maak eerst een site aan.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                {ownedSites.map((site) => (
                  <label key={site.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.id)}
                      onChange={() => toggleSite(site.id, selectedSites, setSelectedSites)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="truncate">{site.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{site.domain}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={handleCreate} disabled={!title || creating}>
              {creating ? 'Aanmaken...' : 'Portal aanmaken'}
            </PrimaryButton>
            <button
              onClick={() => setShowCreate(false)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingState />
      ) : dashboards.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold">Nog geen portals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Maak een client portal om klanten toegang te geven tot rapporten zonder dat ze hoeven in te loggen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dashboards.map((d) => (
            <div key={d.id} className="rounded-lg border bg-card p-5 space-y-3">
              {editing === d.id ? (
                /* ---- Edit mode ---- */
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-medium"
                  />
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Beschrijving"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Nieuw wachtwoord (laat leeg om te behouden)"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Sites</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                      {ownedSites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={editSites.includes(site.id)}
                            onChange={() => toggleSite(site.id, editSites, setEditSites)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="truncate">{site.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{site.domain}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PrimaryButton onClick={handleSave} disabled={saving}>
                      {saving ? 'Opslaan...' : 'Opslaan'}
                    </PrimaryButton>
                    <button
                      onClick={() => setEditing(null)}
                      className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- View mode ---- */
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{d.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {d.shared_dashboard_sites.length} site{d.shared_dashboard_sites.length !== 1 ? 's' : ''}
                        {d.password_hash && ' · 🔒 Wachtwoord'}
                        {' · Aangemaakt '}{new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(d)}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => copyLink(d.token)}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Link kopiëren
                      </button>
                      <a
                        href={`/portal/${d.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Bekijken
                      </a>
                      <DeleteButton onClick={() => handleDelete(d.id)} />
                    </div>
                  </div>

                  {/* Show included sites */}
                  {d.shared_dashboard_sites.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {d.shared_dashboard_sites.map((entry) => {
                        const site = ownedSites.find((s) => s.id === entry.site_id);
                        return (
                          <span
                            key={entry.id}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {site?.name || entry.site_id}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
