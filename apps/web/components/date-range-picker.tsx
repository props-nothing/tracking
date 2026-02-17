'use client';

import { useState } from 'react';
import { useDashboard, type Period } from '@/hooks/use-dashboard-context';

export type { Period };

const periods: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: '7 days' },
  { value: 'last_30_days', label: '30 days' },
  { value: 'last_90_days', label: '90 days' },
  { value: 'last_365_days', label: '365 days' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangePicker() {
  const { period, setPeriod, customFrom, customTo, setCustomFrom, setCustomTo } = useDashboard();
  const [showCustom, setShowCustom] = useState(period === 'custom');

  const handlePeriodClick = (p: Period) => {
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
    setPeriod(p);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePeriodClick(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === p.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom || ''}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border bg-transparent px-2 py-1.5 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo || ''}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border bg-transparent px-2 py-1.5 text-xs"
          />
        </div>
      )}
    </div>
  );
}
