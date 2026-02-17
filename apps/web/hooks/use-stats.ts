'use client';

import { useEffect, useState } from 'react';
import { Period } from './use-date-range';

export interface Stats {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  views_per_session: number;
  avg_engaged_time: number;
  top_pages: { path: string; count: number }[];
  top_referrers: { source: string; count: number }[];
  top_countries: { country: string; count: number }[];
  top_browsers: { browser: string; count: number }[];
  top_os: { os: string; count: number }[];
  top_devices: { device: string; count: number }[];
  timeseries: { date: string; pageviews: number; visitors: number }[];
}

export function useStats(siteId: string | null, period: Period) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);

    fetch(`/api/stats?site_id=${siteId}&period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return { stats, loading };
}
