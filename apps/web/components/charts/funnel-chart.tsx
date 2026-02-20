'use client';

interface FunnelChartProps {
  steps: { name: string; count: number; dropoff: number; conversion_rate: number }[];
}

const COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export function FunnelChart({ steps }: FunnelChartProps) {
  if (!steps.length) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Geen funneldata</div>;
  }

  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.count / maxCount) * 100, 10);
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.name}</span>
              <span className="text-muted-foreground">
                {step.count.toLocaleString()} ({step.conversion_rate}%)
              </span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded bg-muted">
              <div
                className="flex h-full items-center rounded px-3 text-xs font-medium text-white transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              >
                {step.count.toLocaleString()}
              </div>
            </div>
            {step.dropoff > 0 && (
              <div className="text-xs text-red-500">
                ↓ {step.dropoff.toLocaleString()} afgevallen
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
