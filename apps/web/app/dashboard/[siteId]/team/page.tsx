'use client';

import { use, useEffect, useState } from 'react';

interface Member {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  joined_at: string;
}

export default function TeamPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = () => {
    setLoading(true);
    fetch(`/api/members?site_id=${siteId}`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(fetchMembers, [siteId]);

  const handleInvite = async () => {
    setInviting(true);
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, email, role }),
    });
    setEmail('');
    setShowInvite(false);
    setInviting(false);
    fetchMembers();
  };

  const handleRemove = async (memberId: string) => {
    await fetch(`/api/members?site_id=${siteId}&member_id=${memberId}`, { method: 'DELETE' });
    fetchMembers();
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Beheer teamleden en klanttoegang</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Lid uitnodigen
        </button>
      </div>

      {showInvite && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-medium">Teamlid uitnodigen</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@example.com"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="viewer">Kijker — alleen-lezen toegang</option>
                <option value="admin">Beheerder — volledige toegang</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleInvite}
            disabled={!email || inviting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {inviting ? 'Uitnodigen...' : 'Uitnodiging verzenden'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {m.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Lid sinds {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role]}`}>
                  {m.role}
                </span>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
