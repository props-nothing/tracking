'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface NotFoundPage {
  path: string;
  hits: number;
  unique_visitors: number;
  referrers: string[];
  last_seen: string;
}

interface Data404 {
  total_404s: number;
  unique_pages: number;
  pages: NotFoundPage[];
}

export default function NotFoundPagesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<Data404 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=404s`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>;

  if (!data || data.total_404s === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">404 Pages</h1>
          <p className="text-sm text-muted-foreground">Pages that returned a "Not Found" error</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">No 404 errors found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            404 pages are tracked automatically when your site sends a custom "404" event.
          </p>
        </div>
      </div>
    );
  }

  const tableData = data.pages.map((p) => ({
    ...p,
    referrer_list: p.referrers.length > 0 ? p.referrers.join(', ') : '(direct)',
    last_seen_fmt: new Date(p.last_seen).toLocaleDateString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">404 Pages</h1>
        <p className="text-sm text-muted-foreground">Broken links and missing pages</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total 404 Hits" value={data.total_404s.toLocaleString()} />
        <MetricCard title="Unique 404 Pages" value={data.unique_pages.toLocaleString()} />
        <MetricCard
          title="Avg Hits per Page"
          value={data.unique_pages > 0 ? (data.total_404s / data.unique_pages).toFixed(1) : '0'}
        />
      </div>

      <DataTable
        title="404 Pages"
        columns={[
          { key: 'path', label: 'Page Path' },
          { key: 'hits', label: 'Hits', align: 'right' as const, sortable: true },
          { key: 'unique_visitors', label: 'Visitors', align: 'right' as const, sortable: true },
          { key: 'referrer_list', label: 'Referrers' },
          { key: 'last_seen_fmt', label: 'Last Seen', align: 'right' as const },
        ]}
        data={tableData}
        searchable
      />

      {/* Quick fix suggestions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-sm font-medium">Fixing Tips</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Check for broken internal links on pages that reference these URLs</li>
          <li>• Set up 301 redirects for renamed or moved pages</li>
          <li>• Review referrer sources to find where visitors are following broken links</li>
          <li>• Consider adding a helpful custom 404 page with search or navigation</li>
        </ul>
      </div>
    </div>
  );
}
