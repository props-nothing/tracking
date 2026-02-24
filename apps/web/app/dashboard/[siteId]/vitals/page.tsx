'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import { DataTable } from '@/components/tables/data-table';
import type { VitalsData } from '@/types';

function getVitalRating(metric: string, value: number | null): { label: string; color: string } {
  if (value == null) return { label: '—', color: 'text-muted-foreground' };
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fcp: [1800, 3000],
    ttfb: [800, 1800],
    inp: [200, 500],
    fid: [100, 300],
    cls: [0.1, 0.25],
  };
  const [good, poor] = thresholds[metric] || [Infinity, Infinity];
  if (value <= good) return { label: 'Goed', color: 'text-green-600' };
  if (value <= poor) return { label: 'Verbetering nodig', color: 'text-amber-600' };
  return { label: 'Slecht', color: 'text-red-600' };
}

function formatVital(metric: string, value: number | null): string {
  if (value == null) return '—';
  if (metric === 'cls') return value.toFixed(3);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

export default function VitalsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<VitalsData>(siteId, queryString, 'vitals');

  if (loading) return <LoadingState />;

  if (!data || data.overall.sample_count === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Web Vitals" description="Core Web Vitals prestatiemetrieken" />
        <EmptyState
          title="Nog geen vitals-data"
          description="Web Vitals worden automatisch vastgelegd bij elke paginaweergave. Data verschijnt zodra bezoekers beginnen met browsen."
        />
      </div>
    );
  }

  const o = data.overall;
  const vitals = [
    { key: 'lcp', label: 'Largest Contentful Paint (LCP)', description: 'Laadprestaties', metric: o.lcp },
    { key: 'fcp', label: 'First Contentful Paint (FCP)', description: 'Eerste weergave', metric: o.fcp },
    { key: 'cls', label: 'Cumulative Layout Shift (CLS)', description: 'Visuele stabiliteit', metric: o.cls },
    { key: 'inp', label: 'Interaction to Next Paint (INP)', description: 'Responsiviteit', metric: o.inp },
    { key: 'ttfb', label: 'Time to First Byte (TTFB)', description: 'Serversnelheid', metric: o.ttfb },
    { key: 'fid', label: 'First Input Delay (FID)', description: 'Invoervertraging', metric: o.fid },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Web Vitals"
        description={`Core Web Vitals prestaties — ${o.sample_count.toLocaleString()} metingen`}
      />

      {/* Vital Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vitals.map((v) => {
          const rating = getVitalRating(v.key, v.metric.p75);
          return (
            <div key={v.key} className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{v.label}</p>
                  <p className="text-xs text-muted-foreground">{v.description}</p>
                </div>
                <span className={`text-xs font-medium ${rating.color}`}>{rating.label}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">p50</p>
                  <p className="text-xl font-bold">{formatVital(v.key, v.metric.p50)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">p75</p>
                  <p className="text-xl font-bold">{formatVital(v.key, v.metric.p75)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-page breakdown */}
      <DataTable
        title="Vitals per pagina"
        columns={[
          { key: 'path', label: 'Pagina' },
          { key: 'sample_count', label: 'Metingen', align: 'right' as const },
          { key: 'lcp_p75', label: 'LCP p75', align: 'right' as const },
          { key: 'fcp_p75', label: 'FCP p75', align: 'right' as const },
          { key: 'cls_p75', label: 'CLS p75', align: 'right' as const },
          { key: 'inp_p75', label: 'INP p75', align: 'right' as const },
          { key: 'ttfb_p75', label: 'TTFB p75', align: 'right' as const },
        ]}
        data={data.pages.map((p) => ({
          ...p,
          lcp_p75: p.lcp_p75 != null ? `${Math.round(p.lcp_p75)}ms` : '—',
          fcp_p75: p.fcp_p75 != null ? `${Math.round(p.fcp_p75)}ms` : '—',
          cls_p75: p.cls_p75 != null ? p.cls_p75.toFixed(3) : '—',
          inp_p75: p.inp_p75 != null ? `${Math.round(p.inp_p75)}ms` : '—',
          ttfb_p75: p.ttfb_p75 != null ? `${Math.round(p.ttfb_p75)}ms` : '—',
        }))}
        searchable
      />
    </div>
  );
}
