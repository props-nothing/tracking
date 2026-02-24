'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { LoadingState, EmptyState, PageHeader, PrimaryButton } from '@/components/shared';
import type { Goal } from '@/types';

export default function GoalsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/goals?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setGoals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Doelen"
        description="Conversiedoelen en tracking"
        action={
          <Link
            href={`/dashboard/${siteId}/goals/new`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nieuw doel
          </Link>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          title="Nog geen doelen"
          description="Maak je eerste doel aan om conversies te volgen."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/dashboard/${siteId}/goals/${goal.id}`}
              className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{goal.name}</h3>
                <span className={`h-2 w-2 rounded-full ${goal.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{goal.goal_type.replace(/_/g, ' ')}</p>
              <p className="mt-3 text-2xl font-bold">
                {goal.goal_conversions?.[0]?.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">totale conversies</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
