'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';

interface PageData {
  path: string;
  count: number;
  unique_visitors?: number;
  avg_time?: number;
  bounce_rate?: number;
}

interface FlowStats {
  entry_pages: PageData[];
  top_pages: PageData[];
  exit_pages: PageData[];
  pageviews: number;
  sessions: number;
  bounce_rate: number;
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function FlowColumn({
  title,
  subtitle,
  icon,
  items,
  maxCount,
  color,
  showMeta,
}: {
  title: string;
  subtitle: string;
  icon: string;
  items: PageData[];
  maxCount: number;
  color: string;
  showMeta?: 'entry' | 'exit' | 'page';
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: `${color}15`, color }}>{icon}</span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nog geen data</p>
        ) : (
          items.map((item, i) => {
            const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={item.path + i} className="group relative rounded-md border bg-card p-3 transition-colors hover:bg-accent">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={item.path}>
                      {item.path}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{item.count.toLocaleString()} weergaven</span>
                      {showMeta === 'page' && item.unique_visitors != null && (
                        <span>{item.unique_visitors.toLocaleString()} bezoekers</span>
                      )}
                      {showMeta === 'page' && item.avg_time != null && item.avg_time > 0 && (
                        <span>{formatTime(item.avg_time)} gem.</span>
                      )}
                      {showMeta === 'page' && item.bounce_rate != null && (
                        <span>{item.bounce_rate}% bounce</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                {/* Bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <svg width="40" height="40" viewBox="0 0 40 40" className="text-muted-foreground/40">
        <path d="M8 20h20M22 14l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function FlowPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [stats, setStats] = useState<FlowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setStats({
          entry_pages: data.entry_pages || [],
          top_pages: data.top_pages || [],
          exit_pages: data.exit_pages || [],
          pageviews: data.pageviews || 0,
          sessions: data.sessions || 0,
          bounce_rate: data.bounce_rate || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>;
  }

  if (!stats || (stats.entry_pages.length === 0 && stats.top_pages.length === 0)) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gebruikersstroom</h1>
          <p className="text-sm text-muted-foreground">Begrijp hoe bezoekers door je site navigeren</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-medium">Nog niet genoeg data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            De gebruikersstroomweergave heeft paginaweergavendata nodig met instap- en uitstappagina's. Blijf volgen om te zien hoe bezoekers door je site navigeren.
          </p>
        </div>
      </div>
    );
  }

  const entryItems = stats.entry_pages.slice(0, 8);
  const pageItems = stats.top_pages.slice(0, 8);
  const exitItems = stats.exit_pages.slice(0, 8);

  const maxEntry = Math.max(...entryItems.map((p) => p.count), 1);
  const maxPage = Math.max(...pageItems.map((p) => p.count), 1);
  const maxExit = Math.max(...exitItems.map((p) => p.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gebruikersstroom</h1>
        <p className="text-sm text-muted-foreground">Begrijp hoe bezoekers door je site navigeren</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Totaal sessies</p>
          <p className="mt-1 text-2xl font-bold">{stats.sessions.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Totaal paginaweergaven</p>
          <p className="mt-1 text-2xl font-bold">{stats.pageviews.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Pagina's / sessie</p>
          <p className="mt-1 text-2xl font-bold">
            {stats.sessions > 0 ? (stats.pageviews / stats.sessions).toFixed(1) : '0'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Bouncepercentage</p>
          <p className="mt-1 text-2xl font-bold">{stats.bounce_rate}%</p>
        </div>
      </div>

      {/* Three-column flow */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <FlowColumn
          title="Instappagina's"
          subtitle="Waar bezoekers landen"
          icon="→"
          items={entryItems}
          maxCount={maxEntry}
          color="#22c55e"
          showMeta="entry"
        />
        <FlowArrow />
        <FlowColumn
          title="Toppagina's"
          subtitle="Meest bekeken content"
          icon="◆"
          items={pageItems}
          maxCount={maxPage}
          color="#6366f1"
          showMeta="page"
        />
        <FlowArrow />
        <FlowColumn
          title="Uitstappagina's"
          subtitle="Waar bezoekers vertrekken"
          icon="←"
          items={exitItems}
          maxCount={maxExit}
          color="#ef4444"
          showMeta="exit"
        />
      </div>

      {/* Insight: paths that are both entry & exit */}
      {(() => {
        const entrySet = new Set(entryItems.map((p) => p.path));
        const exitSet = new Set(exitItems.map((p) => p.path));
        const bouncePaths = [...entrySet].filter((p) => exitSet.has(p));
        if (bouncePaths.length === 0) return null;

        return (
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-5">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Potentiële bouncepagina's
            </h3>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Deze pagina's verschijnen in zowel de instap- als uitstaplijsten — bezoekers landen mogelijk en vertrekken zonder verder te kijken.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {bouncePaths.map((path) => (
                <span
                  key={path}
                  className="rounded-md border border-amber-200 dark:border-amber-700 bg-white dark:bg-amber-900/50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                >
                  {path}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
