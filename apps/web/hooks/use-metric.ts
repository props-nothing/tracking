'use client';

import { useEffect, useState } from 'react';
import { api, statsUrl } from '@/lib/api';

/**
 * Generic data-fetching hook for metric pages.
 * Replaces the copy-pasted useState+useEffect+fetch pattern
 * found across ~20 dashboard pages.
 *
 * @param siteId   - The site UUID
 * @param queryString - Pre-built query string from useDashboard()
 * @param metric   - Optional metric query param (e.g. 'vitals', 'ecommerce')
 */
export function useMetric<T>(
  siteId: string,
  queryString: string,
  metric?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<T>(statsUrl(siteId, queryString, metric))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [siteId, queryString, metric]);

  return { data, loading };
}
