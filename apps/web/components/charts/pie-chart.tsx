'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#818cf8', '#4f46e5'];

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function PieChart({ data, height = 300 }: PieChartProps) {
  if (!data.length) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Geen data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {data.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-card-foreground)' }}
          itemStyle={{ color: 'var(--color-foreground)' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-foreground)' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
