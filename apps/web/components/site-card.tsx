'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRealtimeVisitors } from '@/hooks/use-realtime-visitors';
import type { Site } from '@/hooks/use-site';

/* ------------------------------------------------------------------ */
/*  Tiny sparkline – pure SVG, no dependencies                        */
/* ------------------------------------------------------------------ */
function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 24;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * (h - 2)}`).join(' ');
  // gradient fill under the line
  const fillPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#spark-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick stats hook – lightweight fetch of today's numbers + 7-day   */
/* ------------------------------------------------------------------ */
interface QuickStats {
  pageviews: number;
  visitors: number;
  sparkline: number[];
}

function useQuickStats(siteId: string) {
  const [data, setData] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch today's numbers
        const todayRes = await fetch(
          `/api/stats?site_id=${siteId}&period=today`
        );
        const today = todayRes.ok ? await todayRes.json() : null;

        // Fetch last 7 days for sparkline
        const weekRes = await fetch(
          `/api/stats?site_id=${siteId}&period=last_7_days`
        );
        const week = weekRes.ok ? await weekRes.json() : null;

        if (!cancelled) {
          setData({
            pageviews: today?.pageviews ?? 0,
            visitors: today?.unique_visitors ?? 0,
            sparkline: (week?.timeseries ?? []).map(
              (d: { pageviews: number }) => d.pageviews
            ),
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return { data, loading };
}

/* ------------------------------------------------------------------ */
/*  Compact number formatter                                          */
/* ------------------------------------------------------------------ */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/* ------------------------------------------------------------------ */
/*  SiteCard                                                          */
/* ------------------------------------------------------------------ */
interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  const { count: liveCount, loading: liveLoading } = useRealtimeVisitors(site.id);
  const { data: quick, loading: quickLoading } = useQuickStats(site.id);

  // Activity level drives the accent colour
  const activityLevel: 'active' | 'warm' | 'idle' =
    liveCount >= 3 ? 'active' : liveCount >= 1 ? 'warm' : 'idle';

  const borderColor = {
    active: 'border-l-green-500',
    warm: 'border-l-amber-400',
    idle: 'border-l-border',
  }[activityLevel];

  return (
    <Link
      href={`/dashboard/${site.id}`}
      className={`group relative rounded-lg border border-l-[3px] ${borderColor} bg-card p-5 transition-all hover:shadow-md hover:bg-accent/50`}
    >
      {/* ---- Header row: name + live badge ---- */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">{site.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {site.domain}
          </p>
        </div>

        {/* Live visitor indicator */}
        {!liveLoading && (
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              liveCount > 0
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {liveCount > 0 ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                {liveCount} live
              </>
            ) : (
              <>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                idle
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- Quick stats + sparkline ---- */}
      <div className="mt-4 flex items-end justify-between gap-3">
        {quickLoading ? (
          <div className="flex gap-4">
            <div className="h-8 w-14 animate-pulse rounded bg-muted" />
            <div className="h-8 w-14 animate-pulse rounded bg-muted" />
          </div>
        ) : quick ? (
          <div className="flex gap-4">
            <div>
              <p className="text-lg font-bold leading-none tracking-tight">
                {fmt(quick.pageviews)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Views today
              </p>
            </div>
            <div>
              <p className="text-lg font-bold leading-none tracking-tight">
                {fmt(quick.visitors)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Visitors today
              </p>
            </div>
          </div>
        ) : null}

        {/* 7-day sparkline */}
        {quick?.sparkline && quick.sparkline.length > 1 && (
          <Sparkline
            data={quick.sparkline}
            className="h-6 w-20 shrink-0 text-primary/60"
          />
        )}
      </div>

      {/* ---- Footer: role badge ---- */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {site.role}
        </span>
      </div>
    </Link>
  );
}
