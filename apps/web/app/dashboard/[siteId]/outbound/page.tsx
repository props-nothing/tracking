'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';

interface OutboundLink {
  hostname: string;
  clicks: number;
  unique_visitors: number;
  top_url: string;
}

interface DownloadFile {
  filename: string;
  downloads: number;
  unique_visitors: number;
  extension: string;
}

export default function OutboundDownloadsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [totalOutbound, setTotalOutbound] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [outboundLinks, setOutboundLinks] = useState<OutboundLink[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=outbound_downloads`)
      .then((res) => res.json())
      .then((d) => {
        setTotalOutbound(d.total_outbound || 0);
        setTotalDownloads(d.total_downloads || 0);
        setOutboundLinks(d.outbound_links || []);
        setDownloadFiles(d.download_files || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Uitgaande links & downloads</h1>
        <p className="text-sm text-muted-foreground">Externe linkklikken en bestandsdownloads</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Totaal uitgaande klikken" value={totalOutbound.toLocaleString()} />
            <MetricCard title="Unieke uitgaande hosts" value={outboundLinks.length.toString()} />
            <MetricCard title="Totaal downloads" value={totalDownloads.toLocaleString()} />
            <MetricCard title="Unieke bestanden" value={downloadFiles.length.toString()} />
          </div>

          {outboundLinks.length === 0 && downloadFiles.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">Nog geen uitgaande klikken of downloads</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Uitgaande linkklikken en bestandsdownloads worden automatisch gevolgd.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DataTable
                title="Uitgaande links"
                columns={[
                  { key: 'hostname', label: 'Hostnaam' },
                  { key: 'clicks', label: 'Klikken', align: 'right' as const, sortable: true },
                  { key: 'unique_visitors', label: 'Bezoekers', align: 'right' as const },
                ]}
                data={outboundLinks}
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
                data={downloadFiles}
                searchable
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
