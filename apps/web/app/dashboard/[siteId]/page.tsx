'use client';

import { use, useMemo } from 'react';
import { useSite } from '@/hooks/use-site';
import { useStats } from '@/hooks/use-stats';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { DashboardGrid } from '@/components/dashboard-grid';
import { ExportBar } from '@/components/export-bar';
import { LoadingState } from '@/components/shared';
import { getPeriodDateRange } from '@/lib/query-helpers';

export default function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const { site, loading: siteLoading } = useSite(siteId);
  const { period, queryString, customFrom, customTo } = useDashboard();
  const { stats, loading: statsLoading } = useStats(siteId, queryString);
  const {
    widgets,
    setWidgets,
    editMode,
    setEditMode,
    saving,
    dirty,
    save,
    reset,
    loading: layoutLoading,
  } = useDashboardLayout(siteId);

  // Compute date range for AI insights
  const { periodStart, periodEnd } = useMemo(
    () => getPeriodDateRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  if (siteLoading || layoutLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{site?.name || 'Site-analyse'}</h1>
          <p className="text-sm text-muted-foreground">{site?.domain}</p>
        </div>
      </div>

      <ExportBar siteId={siteId} period={period} />

      {statsLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Analyse laden...</div>
      ) : stats ? (
        <DashboardGrid
          widgets={widgets}
          setWidgets={setWidgets}
          editMode={editMode}
          setEditMode={setEditMode}
          saving={saving}
          dirty={dirty}
          onSave={save}
          onReset={reset}
          stats={stats}
          siteId={siteId}
          period={period}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      ) : null}
    </div>
  );
}
