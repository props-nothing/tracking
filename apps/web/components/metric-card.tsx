'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // percentage change
}

export function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
      <div className="mt-1.5 flex items-baseline gap-2 sm:mt-2">
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
        {trend !== undefined && (
          <span
            className={`text-sm font-medium ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
