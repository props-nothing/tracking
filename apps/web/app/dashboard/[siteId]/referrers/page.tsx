'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { DataTable } from '@/components/tables/data-table';

export default function ReferrersPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [referrers, setReferrers] = useState<{ source: string; count: number }[]>([]);
  const [utmSources, setUtmSources] = useState<{ source: string; count: number }[]>([]);
  const [utmMediums, setUtmMediums] = useState<{ medium: string; count: number }[]>([]);
  const [utmCampaigns, setUtmCampaigns] = useState<{ campaign: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setReferrers(data.top_referrers || []);
        setUtmSources(data.utm_sources || []);
        setUtmMediums(data.utm_mediums || []);
        setUtmCampaigns(data.utm_campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referrers</h1>
          <p className="text-sm text-muted-foreground">Traffic sources and UTM campaigns</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <DataTable
            title="Top Referrers"
            columns={[
              { key: 'source', label: 'Source' },
              { key: 'count', label: 'Visits', align: 'right' },
            ]}
            data={referrers}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <DataTable
              title="UTM Sources"
              columns={[
                { key: 'source', label: 'Source' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={utmSources}
            />
            <DataTable
              title="UTM Mediums"
              columns={[
                { key: 'medium', label: 'Medium' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={utmMediums}
            />
            <DataTable
              title="UTM Campaigns"
              columns={[
                { key: 'campaign', label: 'Campaign' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={utmCampaigns}
            />
          </div>
        </>
      )}
    </div>
  );
}
