'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { RevenueTimeSeries } from '@/components/charts/revenue-time-series';

export default function EcommercePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [data, setData] = useState<{
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    top_products: { name: string; revenue: number; quantity: number }[];
    revenue_timeseries: { date: string; revenue: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}&metric=ecommerce`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-commerce</h1>
          <p className="text-sm text-muted-foreground">Revenue, orders, and product analytics</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Total Revenue" value={`$${(data?.total_revenue || 0).toFixed(2)}`} />
            <MetricCard title="Total Orders" value={(data?.total_orders || 0).toString()} />
            <MetricCard title="Avg. Order Value" value={`$${(data?.avg_order_value || 0).toFixed(2)}`} />
          </div>

          {data?.revenue_timeseries && data.revenue_timeseries.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium">Revenue Over Time</h2>
              <RevenueTimeSeries data={data.revenue_timeseries} />
            </div>
          )}

          <DataTable
            title="Top Products"
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'quantity', label: 'Quantity', align: 'right' },
              { key: 'revenue', label: 'Revenue', align: 'right' },
            ]}
            data={(data?.top_products || []).map((p) => ({
              ...p,
              revenue: `$${p.revenue.toFixed(2)}`,
            }))}
          />
        </>
      )}
    </div>
  );
}
