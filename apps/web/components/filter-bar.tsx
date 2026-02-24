'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard, type Filters } from '@/hooks/use-dashboard-context';

const filterFields: { key: keyof Filters; label: string; placeholder: string }[] = [
  { key: 'page', label: 'Pagina', placeholder: '/blog/*' },
  { key: 'country', label: 'Land', placeholder: 'US' },
  { key: 'browser', label: 'Browser', placeholder: 'Chrome' },
  { key: 'os', label: 'OS', placeholder: 'macOS' },
  { key: 'device', label: 'Apparaat', placeholder: 'desktop' },
  { key: 'referrer', label: 'Verwijzer', placeholder: 'google.com' },
];

export type { Filters };

export function FilterBar() {
  const { filters, setFilters, clearFilters, activeFilterCount } = useDashboard();
  const [open, setOpen] = useState(false);
  // Local draft state so typing is instant — only syncs to URL after a delay
  const [draft, setDraft] = useState<Filters>(filters);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft ← URL when filters change externally (e.g. "clear all", back/forward)
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const commitFilters = useCallback(
    (next: Filters) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFilters(next);
      }, 500);
    },
    [setFilters]
  );

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleChange = (key: keyof Filters, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    commitFilters(next);
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDraft({});
    clearFilters();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Commit immediately on Enter
      if (timerRef.current) clearTimeout(timerRef.current);
      setFilters(draft);
    }
  };

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
          <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground">
            Alles wissen
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
                value={draft[f.key] || ''}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onKeyDown={handleKeyDown}
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
