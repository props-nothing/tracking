'use client';

interface RetentionMatrixProps {
  cohorts: {
    label: string;
    total: number;
    periods: number[]; // percentage retained per period
  }[];
  periodLabel?: string;
}

export function RetentionMatrix({ cohorts, periodLabel = 'Week' }: RetentionMatrixProps) {
  if (!cohorts.length) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No retention data</div>;
  }

  const maxPeriods = Math.max(...cohorts.map((c) => c.periods.length));

  const getColor = (pct: number): string => {
    if (pct >= 50) return 'bg-indigo-600 text-white';
    if (pct >= 30) return 'bg-indigo-500 text-white';
    if (pct >= 20) return 'bg-indigo-400 text-white';
    if (pct >= 10) return 'bg-indigo-300';
    if (pct > 0) return 'bg-indigo-200';
    return 'bg-gray-100';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cohort</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Users</th>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <th key={i} className="px-3 py-2 text-center font-medium text-muted-foreground">
                {periodLabel} {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, i) => (
            <tr key={i}>
              <td className="px-3 py-2 font-medium">{cohort.label}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{cohort.total}</td>
              {Array.from({ length: maxPeriods }, (_, j) => {
                const pct = cohort.periods[j] ?? 0;
                return (
                  <td key={j} className="px-1 py-1 text-center">
                    <div className={`rounded p-2 ${getColor(pct)}`}>
                      {pct > 0 ? `${pct}%` : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
