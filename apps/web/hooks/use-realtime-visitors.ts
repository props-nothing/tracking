'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActiveVisitor {
  path: string;
  visitor: string;
}

export function useRealtimeVisitors(siteId: string | null) {
  const [count, setCount] = useState(0);
  const [pages, setPages] = useState<ActiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;

    const supabase = createClient();

    // Initial fetch of active visitors
    const fetchActive = async () => {
      const { data } = await supabase
        .from('active_visitors')
        .select('active_count, active_pages')
        .eq('site_id', siteId)
        .maybeSingle();

      setCount(data?.active_count || 0);
      setPages(data?.active_pages || []);
      setLoading(false);
    };

    fetchActive();

    // Subscribe to new events for real-time updates
    const channel = supabase
      .channel(`realtime-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `site_id=eq.${siteId}`,
        },
        () => {
          // Refetch active visitors on each new event
          fetchActive();
        }
      )
      .subscribe();

    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchActive, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [siteId]);

  return { count, pages, loading };
}
