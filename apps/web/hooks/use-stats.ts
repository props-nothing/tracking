'use client';

import { useEffect, useState } from 'react';
import type { OverviewStats } from '@/types';

// Re-export for backward compatibility
export type Stats = OverviewStats;

/**
 * Fetch stats using the full query string from DashboardContext.
 * @param siteId - The site ID
 * @param queryString - Pre-built query string with period, from, to, and all filters
 * @param metric - Optional metric type (ecommerce, errors, events, retention)
 */
export function useStats(siteId: string | null, queryString: string, metric?: string) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);

    let url = `/api/stats?site_id=${siteId}&${queryString}`;
    if (metric) url += `&metric=${metric}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setStats(null);
        setLoading(false);
      });
  }, [siteId, queryString, metric]);

  return { stats, loading };
}
