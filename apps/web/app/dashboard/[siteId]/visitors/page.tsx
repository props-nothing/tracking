'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import { PageHeader } from '@/components/shared';
import { formatDate, formatDuration, timeAgo, getDeviceIcon, getCountryFlag } from '@/lib/formatters';
import Link from 'next/link';
import type { Visitor, VisitorStats } from '@/types';

function getSourceLabel(visitor: Visitor): string {
  // Prefer last-touch attribution (most recent visit source)
  if (visitor.last_utm_source) {
    const parts = [visitor.last_utm_source];
    if (visitor.last_utm_medium) parts.push(visitor.last_utm_medium);
    return parts.join(' / ');
  }
  if (visitor.last_referrer_hostname) return visitor.last_referrer_hostname;
  // Fall back to first-touch attribution
  if (visitor.first_utm_source) {
    const parts = [visitor.first_utm_source];
    if (visitor.first_utm_medium) parts.push(visitor.first_utm_medium);
    return parts.join(' / ');
  }
  if (visitor.first_referrer_hostname) return visitor.first_referrer_hostname;
  return 'Direct';
}

export default function VisitorsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ total_visitors: 0, returning_visitors: 0, new_visitors: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('last_seen_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [returningOnly, setReturningOnly] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchVisitors = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams(queryString);
    p.set('site_id', siteId);
    p.set('page', page.toString());
    p.set('page_size', '50');
    p.set('sort', sort);
    p.set('order', order);
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (deviceFilter) p.set('device', deviceFilter);
    if (countryFilter) p.set('country', countryFilter);
    if (returningOnly) p.set('returning', 'true');

    fetch(`/api/visitors?${p}`)
      .then(r => r.json())
      .then(data => {
        setVisitors(data.visitors || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId, queryString, page, sort, order, debouncedSearch, deviceFilter, countryFilter, returningOnly]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(0);
  };

  const sortIcon = (col: string) => {
    if (sort !== col) return '';
    return order === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bezoekers" description="Bekijk individuele bezoekersprofielen en hun activiteitengeschiedenis" />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Totaal bezoekers" value={stats.total_visitors.toLocaleString()} />
        <MetricCard title="Terugkerende bezoekers" value={stats.returning_visitors.toLocaleString()} />
        <MetricCard title="Nieuwe bezoekers" value={stats.new_visitors.toLocaleString()} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Zoek bezoeker-ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary w-48"
        />
        <select
          value={deviceFilter}
          onChange={e => { setDeviceFilter(e.target.value); setPage(0); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Alle apparaten</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobiel</option>
          <option value="tablet">Tablet</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={returningOnly}
            onChange={e => { setReturningOnly(e.target.checked); setPage(0); }}
            className="rounded"
          />
          Alleen terugkerend
        </label>
      </div>

      {/* Visitors Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Bezoeker</th>
                <th className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('total_sessions')}>
                  Sessies{sortIcon('total_sessions')}
                </th>
                <th className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('total_pageviews')}>
                  Paginaweergaven{sortIcon('total_pageviews')}
                </th>
                <th className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('total_revenue')}>
                  Omzet{sortIcon('total_revenue')}
                </th>
                <th className="px-4 py-2 text-left font-medium">Bron</th>
                <th className="px-4 py-2 text-left font-medium">Locatie</th>
                <th className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('first_seen_at')}>
                  Eerst gezien{sortIcon('first_seen_at')}
                </th>
                <th className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => handleSort('last_seen_at')}>
                  Laatst gezien{sortIcon('last_seen_at')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Bezoekers laden...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Geen bezoekers gevonden.
                  </td>
                </tr>
              ) : (
                visitors.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${siteId}/visitors/${v.visitor_id}`} className="group flex items-center gap-2">
                        <span className="text-lg">{getDeviceIcon(v.last_device_type)}</span>
                        <div>
                          <div className="text-sm font-medium group-hover:text-primary transition-colors">
                            {v.last_browser || 'Unknown'} on {v.last_os || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {v.visitor_id.slice(0, 8)}...
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      <span className={v.total_sessions > 1 ? 'text-primary font-medium' : ''}>
                        {v.total_sessions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">{v.total_pageviews}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {v.total_revenue > 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          €{Number(v.total_revenue).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {getSourceLabel(v)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {v.last_country_code ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{getCountryFlag(v.last_country_code)}</span>
                          <span>{v.last_city || v.last_country_code}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(v.first_seen_at)}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{timeAgo(v.last_seen_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Tonen {page * 50 + 1}–{Math.min((page + 1) * 50, total)} van {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vorige
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volgende
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
