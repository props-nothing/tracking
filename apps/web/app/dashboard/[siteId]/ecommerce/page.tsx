'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { RevenueTimeSeries } from '@/components/charts/revenue-time-series';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩',
  INR: '₹', BRL: 'R$', RUB: '₽', TRY: '₺', PLN: 'zł', CHF: 'CHF',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CZK: 'Kč', AUD: 'A$', CAD: 'C$',
};

function formatMoney(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${amount.toFixed(2)}`;
}

interface EcommerceData {
  currency: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  add_to_cart_count: number;
  checkout_count: number;
  purchase_count: number;
  top_products: { name: string; revenue: number; quantity: number }[];
  revenue_timeseries: { date: string; revenue: number }[];
}

export default function EcommercePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [data, setData] = useState<EcommerceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}&metric=ecommerce`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  const currency = data?.currency || 'EUR';
  const hasData = data && (data.total_orders > 0 || data.add_to_cart_count > 0 || data.checkout_count > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-commerce</h1>
          <p className="text-sm text-muted-foreground">Omzet, bestellingen, conversiefunnel en productanalyse</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : !hasData ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Nog geen e-commercedata</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            E-commerce-events worden automatisch gevolgd voor WooCommerce- en Shopify-winkels.
            Data verschijnt hier zodra klanten items aan het winkelwagentje toevoegen en bestellingen plaatsen.
          </p>
        </div>
      ) : (
        <>
          {/* Revenue metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Totale omzet" value={formatMoney(data.total_revenue, currency)} />
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
