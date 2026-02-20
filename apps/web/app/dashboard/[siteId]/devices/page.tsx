'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { DataTable } from '@/components/tables/data-table';
import { PieChart } from '@/components/charts/pie-chart';

export default function DevicesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [browsers, setBrowsers] = useState<{ browser: string; count: number }[]>([]);
  const [os, setOs] = useState<{ os: string; count: number }[]>([]);
  const [devices, setDevices] = useState<{ device: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setBrowsers(data.top_browsers || []);
        setOs(data.top_os || []);
        setDevices(data.top_devices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apparaten</h1>
          <p className="text-sm text-muted-foreground">Browsers, besturingssystemen en apparaattypen</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : (
        <>
          {/* Device type chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Apparaattypen</h2>
            <PieChart
              data={devices.map((d) => ({ name: d.device, value: d.count }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Browsers"
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={browsers}
            />

            <DataTable
              title="Besturingssystemen"
              columns={[
                { key: 'os', label: 'OS' },
                { key: 'count', label: 'Bezoeken', align: 'right' },
              ]}
              data={os}
            />
          </div>
        </>
      )}
    </div>
  );
}
