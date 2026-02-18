'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface VitalMetric {
  p50: number | null;
  p75: number | null;
}

interface VitalsData {
  overall: {
    sample_count: number;
    ttfb: VitalMetric;
    fcp: VitalMetric;
    lcp: VitalMetric;
    cls: VitalMetric;
    inp: VitalMetric;
    fid: VitalMetric;
  };
  pages: {
    path: string;
    sample_count: number;
    lcp_p75: number | null;
    fcp_p75: number | null;
    cls_p75: number | null;
    inp_p75: number | null;
    ttfb_p75: number | null;
  }[];
  timeseries: { date: string; lcp_p75: number | null }[];
}

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
  if (value <= good) return { label: 'Good', color: 'text-green-600' };
  if (value <= poor) return { label: 'Needs Improvement', color: 'text-amber-600' };
  return { label: 'Poor', color: 'text-red-600' };
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
  const [data, setData] = useState<VitalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=vitals`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;

  if (!data || data.overall.sample_count === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Web Vitals</h1>
          <p className="text-sm text-muted-foreground">Core Web Vitals performance metrics</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No vitals data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Web Vitals are automatically captured for every pageview. Data will appear once visitors start browsing.
          </p>
        </div>
      </div>
    );
  }

  const o = data.overall;
  const vitals = [
    { key: 'lcp', label: 'Largest Contentful Paint (LCP)', description: 'Loading performance', metric: o.lcp },
    { key: 'fcp', label: 'First Contentful Paint (FCP)', description: 'First paint', metric: o.fcp },
    { key: 'cls', label: 'Cumulative Layout Shift (CLS)', description: 'Visual stability', metric: o.cls },
    { key: 'inp', label: 'Interaction to Next Paint (INP)', description: 'Responsiveness', metric: o.inp },
    { key: 'ttfb', label: 'Time to First Byte (TTFB)', description: 'Server speed', metric: o.ttfb },
    { key: 'fid', label: 'First Input Delay (FID)', description: 'Input delay', metric: o.fid },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Web Vitals</h1>
          <p className="text-sm text-muted-foreground">
            Core Web Vitals performance — {o.sample_count.toLocaleString()} samples
          </p>
        </div>
      </div>

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
        title="Vitals by Page"
        columns={[
          { key: 'path', label: 'Page' },
          { key: 'sample_count', label: 'Samples', align: 'right' as const },
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
