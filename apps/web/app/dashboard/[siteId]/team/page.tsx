'use client';

import { use, useState } from 'react';
import { useCrud } from '@/hooks/use-crud';
import { LoadingState, PageHeader, PrimaryButton } from '@/components/shared';
import type { Member } from '@/types';

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export default function TeamPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { items: members, loading, createItem, fetchItems } = useCrud<Member>('/api/members', siteId, 'members');

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async () => {
    setInviting(true);
    setInviteMessage(null);
    try {
      await createItem({ email, role });
      setEmail('');
      setShowInvite(false);
      setInviteMessage({ type: 'success', text: `Uitnodiging verzonden naar ${email}` });
    } catch {
      setInviteMessage({ type: 'error', text: 'Er ging iets mis bij het uitnodigen. Probeer het opnieuw.' });
    }
    setInviting(false);
  };

  const handleRemove = async (member: Member) => {
    const endpoint = member.status === 'pending' ? 'invitations' : 'members';
    await fetch(`/api/${endpoint}?site_id=${siteId}&member_id=${member.id}`, { method: 'DELETE' });
    fetchItems();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Beheer teamleden en klanttoegang"
        action={
          <PrimaryButton onClick={() => setShowInvite(!showInvite)}>
            Lid uitnodigen
          </PrimaryButton>
        }
      />

      {inviteMessage && (
        <div className={`rounded-lg border p-4 text-sm ${
          inviteMessage.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {inviteMessage.text}
        </div>
      )}

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
          <PrimaryButton onClick={handleInvite} disabled={!email || inviting}>
            {inviting ? 'Uitnodigen...' : 'Uitnodiging verzenden'}
          </PrimaryButton>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-3">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">Nog geen teamleden. Nodig iemand uit om te beginnen.</p>
          )}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'
                }`}>
                  {m.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.status === 'pending'
                      ? `Uitgenodigd op ${new Date(m.joined_at).toLocaleDateString()}`
                      : `Lid sinds ${new Date(m.joined_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.status === 'pending' && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors.pending}`}>
                    Uitgenodigd
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role] || roleColors.viewer}`}>
                  {m.role}
                </span>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m)}
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
