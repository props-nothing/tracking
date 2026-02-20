'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩',
  INR: '₹', BRL: 'R$', RUB: '₽', TRY: '₺', PLN: 'zł', CHF: 'CHF',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CZK: 'Kč', AUD: 'A$', CAD: 'C$',
};

interface RevenueTimeSeriesProps {
  data: { date: string; revenue: number }[];
  currency?: string;
}

export function RevenueTimeSeries({ data, currency = 'EUR' }: RevenueTimeSeriesProps) {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Geen omzetdata voor deze periode
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }}
          fontSize={12}
          tick={{ fill: 'var(--color-muted-foreground)' }}
          stroke="var(--color-border)"
        />
        <YAxis fontSize={12} tick={{ fill: 'var(--color-muted-foreground)' }} stroke="var(--color-border)" tickFormatter={(v) => `${sym}${v}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-card-foreground)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: 'var(--color-foreground)' }}
          formatter={(value: number | undefined) => [`${sym}${(value ?? 0).toFixed(2)}`, 'Omzet']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          name="Omzet"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
