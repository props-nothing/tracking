'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';

interface SharedReport {
  id: string;
  name: string;
  token: string;
  password_protected: boolean;
  created_at: string;
  expires_at: string | null;
}

export default function ReportsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [reports, setReports] = useState<SharedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchReports = () => {
    setLoading(true);
    fetch(`/api/reports?site_id=${siteId}`)
      .then((res) => res.json())
      .then((d) => {
        setReports(d.reports || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchReports, [siteId]);

  const handleCreate = async () => {
    setCreating(true);
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, name, password: password || undefined }),
    });
    setName('');
    setPassword('');
    setShowCreate(false);
    setCreating(false);
    fetchReports();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    fetchReports();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/report/${token}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shared Reports</h1>
          <p className="text-sm text-muted-foreground">Create and manage public report links</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Report
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-medium">Create Shared Report</h2>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Report Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monthly overview"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!name || creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No shared reports yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a shared report to give clients or stakeholders a public link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(r.created_at).toLocaleDateString()}
                  {r.password_protected && ' · 🔒 Password protected'}
                  {r.expires_at && ` · Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyLink(r.token)}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Copy Link
                </button>
                <a
                  href={`/report/${r.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(r.id)}
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
