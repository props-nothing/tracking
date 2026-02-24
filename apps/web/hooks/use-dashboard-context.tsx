'use client';

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Period, Filters } from '@/types';
import { FILTER_KEYS } from '@/types';

// Re-export types for backward compatibility
export type { Period, Filters } from '@/types';

interface DashboardContextValue {
  // Date range
  period: Period;
  setPeriod: (p: Period) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (v: string) => void;
  setCustomTo: (v: string) => void;

  // Filters
  filters: Filters;
  setFilters: (f: Filters) => void;
  updateFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;

  // API query string (ready to append to fetch URL)
  queryString: string;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ── Filter key mapping to URL params ──────────────────────────
const FILTER_PARAMS = FILTER_KEYS;

// ── Provider ──────────────────────────────────────────────────
export function DashboardProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read state from URL params
  const period = (searchParams.get('period') as Period) || 'last_30_days';
  const customFrom = searchParams.get('from') || '';
  const customTo = searchParams.get('to') || '';

  const filters: Filters = useMemo(() => {
    const f: Filters = {};
    for (const key of FILTER_PARAMS) {
      const val = searchParams.get(key);
      if (val) f[key] = val;
    }
    return f;
  }, [searchParams]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  // Helper to update URL params without full navigation
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Setters
  const setPeriod = useCallback(
    (p: Period) => {
      const updates: Record<string, string | null> = { period: p === 'last_30_days' ? null : p };
      if (p !== 'custom') {
        updates.from = null;
        updates.to = null;
      }
      updateParams(updates);
    },
    [updateParams]
  );

  const setCustomFrom = useCallback((v: string) => updateParams({ from: v || null }), [updateParams]);
  const setCustomTo = useCallback((v: string) => updateParams({ to: v || null }), [updateParams]);

  const setFilters = useCallback(
    (f: Filters) => {
      const updates: Record<string, string | null> = {};
      for (const key of FILTER_PARAMS) {
        updates[key] = f[key] || null;
      }
      updateParams(updates);
    },
    [updateParams]
  );

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      updateParams({ [key]: value || null });
    },
    [updateParams]
  );

  const clearFilters = useCallback(() => {
    const updates: Record<string, string | null> = {};
    for (const key of FILTER_PARAMS) {
      updates[key] = null;
    }
    updateParams(updates);
  }, [updateParams]);

  // Build query string for API calls
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('period', period);
    if (period === 'custom' && customFrom) params.set('from', customFrom);
    if (period === 'custom' && customTo) params.set('to', customTo);
    for (const key of FILTER_PARAMS) {
      if (filters[key]) params.set(key, filters[key]!);
    }
    return params.toString();
  }, [period, customFrom, customTo, filters]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      period,
      setPeriod,
      customFrom,
      customTo,
      setCustomFrom,
      setCustomTo,
      filters,
      setFilters,
      updateFilter,
      clearFilters,
      activeFilterCount,
      queryString,
    }),
    [period, setPeriod, customFrom, customTo, setCustomFrom, setCustomTo, filters, setFilters, updateFilter, clearFilters, activeFilterCount, queryString]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────
export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within <DashboardProvider>');
  return ctx;
}
