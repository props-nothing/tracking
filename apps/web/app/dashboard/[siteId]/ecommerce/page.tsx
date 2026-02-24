'use client';

import { use } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { useMetric } from '@/hooks/use-metric';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { RevenueTimeSeries } from '@/components/charts/revenue-time-series';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type { EcommerceData } from '@/types';

export default function EcommercePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const { data, loading } = useMetric<EcommerceData>(siteId, queryString, 'ecommerce');

  const currency = data?.currency || 'EUR';
  const hasData = data && (data.total_orders > 0 || data.add_to_cart_count > 0 || data.checkout_count > 0);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <PageHeader title="E-commerce" description="Omzet, bestellingen, conversiefunnel en productanalyse" />

      {!hasData ? (
        <EmptyState
          title="Nog geen e-commercedata"
          description="E-commerce-events worden automatisch gevolgd voor WooCommerce- en Shopify-winkels. Data verschijnt hier zodra klanten items aan het winkelwagentje toevoegen en bestellingen plaatsen."
        />
      ) : (
        <>
          {/* Revenue metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Totale omzet" value={formatMoney(data.total_revenue, currency)} subtitle="Incl. verzending & BTW" />
            <MetricCard title="Productomzet" value={formatMoney(data.product_revenue ?? 0, currency)} subtitle="Excl. verzending & BTW" />
            <MetricCard title="Totaal bestellingen" value={data.total_orders.toString()} />
            <MetricCard title="Gem. bestelwaarde" value={formatMoney(data.avg_order_value, currency)} />
          </div>

          {/* Conversion funnel */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium">Conversiefunnel</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <FunnelStep
                label="Toevoegen aan winkelwagen"
                count={data.add_to_cart_count}
                pct={100}
              />
              <FunnelStep
                label="Afrekenen starten"
                count={data.checkout_count}
                pct={data.add_to_cart_count > 0 ? Math.round((data.checkout_count / data.add_to_cart_count) * 100) : 0}
              />
              <FunnelStep
                label="Aankoop"
                count={data.purchase_count}
                pct={data.add_to_cart_count > 0 ? Math.round((data.purchase_count / data.add_to_cart_count) * 100) : 0}
              />
            </div>
          </div>

          {data.revenue_timeseries && data.revenue_timeseries.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium">Omzet over tijd</h2>
              <RevenueTimeSeries data={data.revenue_timeseries} currency={currency} />
            </div>
          )}

          <DataTable
            title="Topproducten"
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'quantity', label: 'Aantal', align: 'right' as const },
              { key: 'revenue_fmt', label: 'Omzet', align: 'right' as const },
            ]}
            data={data.top_products.map((p) => ({
              ...p,
              revenue_fmt: formatMoney(p.revenue, currency),
            }))}
          />
        </>
      )}
    </div>
  );
}

function FunnelStep({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{count.toLocaleString()}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% van winkelwagenitems</p>
    </div>
  );
}
