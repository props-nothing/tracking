'use client';

import { useRealtimeVisitors } from '@/hooks/use-realtime-visitors';

interface ActiveVisitorsBadgeProps {
  siteId: string;
}

export function ActiveVisitorsBadge({ siteId }: ActiveVisitorsBadgeProps) {
  const { count } = useRealtimeVisitors(siteId);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      {count} online
    </div>
  );
}
