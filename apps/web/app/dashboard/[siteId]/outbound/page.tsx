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
        <h1 className="text-2xl font-bold tracking-tight">Outbound Links & Downloads</h1>
        <p className="text-sm text-muted-foreground">External link clicks and file downloads</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Outbound Clicks" value={totalOutbound.toLocaleString()} />
            <MetricCard title="Unique Outbound Hosts" value={outboundLinks.length.toString()} />
            <MetricCard title="Total Downloads" value={totalDownloads.toLocaleString()} />
            <MetricCard title="Unique Files" value={downloadFiles.length.toString()} />
          </div>

          {outboundLinks.length === 0 && downloadFiles.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">No outbound clicks or downloads yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Outbound link clicks and file downloads are tracked automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DataTable
                title="Outbound Links"
                columns={[
                  { key: 'hostname', label: 'Hostname' },
                  { key: 'clicks', label: 'Clicks', align: 'right' as const, sortable: true },
                  { key: 'unique_visitors', label: 'Visitors', align: 'right' as const },
                ]}
                data={outboundLinks}
                searchable
              />

              <DataTable
                title="File Downloads"
                columns={[
                  { key: 'filename', label: 'File' },
                  { key: 'extension', label: 'Type' },
                  { key: 'downloads', label: 'Downloads', align: 'right' as const, sortable: true },
                  { key: 'unique_visitors', label: 'Visitors', align: 'right' as const },
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
