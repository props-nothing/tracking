'use client';

import { useState } from 'react';
import { useDashboard, type Filters } from '@/hooks/use-dashboard-context';

const filterFields: { key: keyof Filters; label: string; placeholder: string }[] = [
  { key: 'page', label: 'Page', placeholder: '/blog/*' },
  { key: 'country', label: 'Country', placeholder: 'US' },
  { key: 'browser', label: 'Browser', placeholder: 'Chrome' },
  { key: 'os', label: 'OS', placeholder: 'macOS' },
  { key: 'device', label: 'Device', placeholder: 'desktop' },
  { key: 'referrer', label: 'Referrer', placeholder: 'google.com' },
];

export type { Filters };

export function FilterBar() {
  const { filters, updateFilter, clearFilters, activeFilterCount } = useDashboard();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilterCount > 0
              ? 'border-primary/50 bg-primary/5 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 2h12M3 5h8M5 8h4M6 11h2" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={() => { clearFilters(); setOpen(false); }} className="text-xs text-muted-foreground hover:text-foreground">
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {filterFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {f.label}
              </label>
              <input
                type="text"
                value={filters[f.key] || ''}
                onChange={(e) => updateFilter(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
