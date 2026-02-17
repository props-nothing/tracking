'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { DataTable } from '@/components/tables/data-table';
import { PieChart } from '@/components/charts/pie-chart';

export default function DevicesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [browsers, setBrowsers] = useState<{ browser: string; count: number }[]>([]);
  const [os, setOs] = useState<{ os: string; count: number }[]>([]);
  const [devices, setDevices] = useState<{ device: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setBrowsers(data.top_browsers || []);
        setOs(data.top_os || []);
        setDevices(data.top_devices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-sm text-muted-foreground">Browsers, operating systems, and device types</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Device type chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Device Types</h2>
            <PieChart
              data={devices.map((d) => ({ name: d.device, value: d.count }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Browsers"
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={browsers}
            />

            <DataTable
              title="Operating Systems"
              columns={[
                { key: 'os', label: 'OS' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={os}
            />
          </div>
        </>
      )}
    </div>
  );
}
