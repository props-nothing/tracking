'use client';

import { use, useEffect, useState } from 'react';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface GoalDetail {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  active: boolean;
  conditions: unknown;
  revenue_value: number | null;
  conversions: {
    id: number;
    converted_at: string;
    revenue: number | null;
    referrer_hostname: string | null;
    utm_source: string | null;
    conversion_path: string | null;
  }[];
}

export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; goalId: string }>;
}) {
  const { siteId, goalId } = use(params);
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/goals/${goalId}`)
      .then((res) => res.json())
      .then((data) => {
        setGoal(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [goalId]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!goal) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Goal not found</div>;
  }

  const totalConversions = goal.conversions.length;
  const totalRevenue = goal.conversions.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const uniqueVisitors = new Set(goal.conversions.map((c) => c.conversion_path)).size;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{goal.name}</h1>
        <p className="text-sm text-muted-foreground">
          {goal.goal_type.replace(/_/g, ' ')} &middot; {goal.active ? 'Active' : 'Inactive'}
        </p>
        {goal.description && <p className="mt-1 text-sm">{goal.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Conversions" value={totalConversions.toString()} />
        <MetricCard title="Total Revenue" value={totalRevenue > 0 ? `$${totalRevenue.toFixed(2)}` : '—'} />
        <MetricCard title="Unique Paths" value={uniqueVisitors.toString()} />
      </div>

      <DataTable
        title="Recent Conversions"
        columns={[
          { key: 'conversion_path', label: 'Page' },
          { key: 'referrer_hostname', label: 'Referrer' },
          { key: 'utm_source', label: 'UTM Source' },
          { key: 'revenue', label: 'Revenue', align: 'right' },
          { key: 'converted_at', label: 'Time' },
        ]}
        data={goal.conversions.map((c) => ({
          ...c,
          revenue: c.revenue ? `$${c.revenue}` : '—',
          converted_at: new Date(c.converted_at).toLocaleString(),
          referrer_hostname: c.referrer_hostname || 'Direct',
          utm_source: c.utm_source || '—',
          conversion_path: c.conversion_path || '—',
        }))}
      />
    </div>
  );
}
