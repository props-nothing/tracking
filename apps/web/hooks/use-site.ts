'use client';

import { useEffect, useState } from 'react';
import type { Site } from '@/types';

// Re-export for backward compatibility
export type { Site } from '@/types';

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
