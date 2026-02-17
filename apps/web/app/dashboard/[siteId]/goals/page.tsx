'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import Link from 'next/link';

interface Goal {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  active: boolean;
  goal_conversions: { count: number }[];
}

export default function GoalsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/goals?site_id=${siteId}`)
      .then((res) => res.json())
      .then((data) => {
        setGoals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">Conversion goals and tracking</p>
        </div>
        <Link
          href={`/dashboard/${siteId}/goals/new`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Goal
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : goals.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No goals yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Create your first goal to start tracking conversions.</p>
          <Link
            href={`/dashboard/${siteId}/goals/new`}
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Goal
          </Link>
        </div>
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
              <p className="text-xs text-muted-foreground">total conversions</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
