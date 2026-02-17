'use client';

import { use } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface RevenueTimeSeriesProps {
  data: { date: string; revenue: number }[];
}

export function RevenueTimeSeries({ data }: RevenueTimeSeriesProps) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No revenue data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--chart-2))"
          fillOpacity={1}
          fill="url(#colorRevenue)"
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
