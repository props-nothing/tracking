'use client';

import { useEffect, useState } from 'react';

export interface Stats {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  views_per_session: number;
  avg_engaged_time: number;
  top_pages: { path: string; count: number; unique_visitors: number; avg_time: number; bounce_rate: number }[];
  entry_pages: { path: string; count: number }[];
  exit_pages: { path: string; count: number }[];
  top_referrers: { source: string; count: number }[];
  utm_sources: { source: string; count: number }[];
  utm_mediums: { medium: string; count: number }[];
  utm_campaigns: { campaign: string; count: number }[];
  top_countries: { country: string; count: number }[];
  top_cities: { city: string; count: number }[];
  top_browsers: { browser: string; count: number }[];
  top_os: { os: string; count: number }[];
  top_devices: { device: string; count: number }[];
  timeseries: { date: string; pageviews: number; visitors: number }[];
}

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
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString, metric]);

  return { stats, loading };
}
