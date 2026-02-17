'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Site {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  logo_url: string | null;
  brand_color: string;
  role: string;
  created_at: string;
}

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sites')
      .then((res) => res.json())
      .then((data) => {
        setSites(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { sites, loading };
}

export function useSite(siteId: string) {
  const { sites, loading } = useSites();
  const site = sites.find((s) => s.id === siteId);
  return { site, loading };
}
