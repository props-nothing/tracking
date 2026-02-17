'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { DataTable } from '@/components/tables/data-table';
import { BarChart } from '@/components/charts/bar-chart';

export default function GeoPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [countries, setCountries] = useState<{ country: string; count: number }[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setCountries(data.top_countries || []);
        setCities(data.top_cities || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geography</h1>
          <p className="text-sm text-muted-foreground">Visitors by location</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Country chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Top Countries</h2>
            <BarChart
              data={countries.slice(0, 10).map((c) => ({ name: c.country, value: c.count }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Countries"
              columns={[
                { key: 'country', label: 'Country' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={countries}
            />

            <DataTable
              title="Cities"
              columns={[
                { key: 'city', label: 'City' },
                { key: 'count', label: 'Visits', align: 'right' },
              ]}
              data={cities}
            />
          </div>
        </>
      )}
    </div>
  );
}
