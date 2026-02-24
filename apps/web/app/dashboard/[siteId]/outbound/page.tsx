'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import type { OutboundData } from '@/types';

export default function OutboundDownloadsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<OutboundData>(siteId, queryString, 'outbound_downloads');

  return (
    <div className="space-y-8">
      <PageHeader title="Uitgaande links & downloads" description="Externe linkklikken en bestandsdownloads" />

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Totaal uitgaande klikken" value={(data?.total_outbound ?? 0).toLocaleString()} />
            <MetricCard title="Unieke uitgaande hosts" value={(data?.outbound_links?.length ?? 0).toString()} />
            <MetricCard title="Totaal downloads" value={(data?.total_downloads ?? 0).toLocaleString()} />
            <MetricCard title="Unieke bestanden" value={(data?.download_files?.length ?? 0).toString()} />
          </div>

          {!data?.outbound_links?.length && !data?.download_files?.length ? (
            <EmptyState
              title="Nog geen uitgaande klikken of downloads"
              description="Uitgaande linkklikken en bestandsdownloads worden automatisch gevolgd."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DataTable
                title="Uitgaande links"
                columns={[
                  { key: 'hostname', label: 'Hostnaam' },
                  { key: 'clicks', label: 'Klikken', align: 'right' as const, sortable: true },
                  { key: 'unique_visitors', label: 'Bezoekers', align: 'right' as const },
                ]}
                data={data?.outbound_links || []}
                searchable
              />

              <DataTable
                title="Bestandsdownloads"
                columns={[
                  { key: 'filename', label: 'Bestand' },
                  { key: 'extension', label: 'Type' },
                  { key: 'downloads', label: 'Downloads', align: 'right' as const, sortable: true },
                  { key: 'unique_visitors', label: 'Bezoekers', align: 'right' as const },
                ]}
                data={data?.download_files || []}
                searchable
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
