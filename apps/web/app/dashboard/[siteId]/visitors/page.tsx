'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { MetricCard } from '@/components/metric-card';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Visitor {
  id: string;
  visitor_id: string;
  site_id: string;
  first_seen_at: string;
  last_seen_at: string;
  total_sessions: number;
  total_pageviews: number;
  total_events: number;
  total_revenue: number;
  total_engaged_time_ms: number;
  first_referrer_hostname: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_entry_path: string | null;
  last_country_code: string | null;
  last_city: string | null;
  last_device_type: string | null;
  last_browser: string | null;
  last_os: string | null;
}

interface VisitorStats {
  total_visitors: number;
  returning_visitors: number;
  new_visitors: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return '0s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function getDeviceIcon(device: string | null): string {
  switch (device) {
    case 'mobile': return '📱';
    case 'tablet': return '📲';
    default: return '🖥️';
  }
}

function getBrowserIcon(browser: string | null): string {
  if (!browser) return '🌐';
  const b = browser.toLowerCase();
  if (b.includes('chrome')) return '🟢';
  if (b.includes('firefox')) return '🟠';
  if (b.includes('safari')) return '🔵';
  if (b.includes('edge')) return '🔷';
  return '🌐';
}

function getCountryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(c => 0x1F1E6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getSourceLabel(visitor: Visitor): string {
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
  const pathname = usePathname();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ total_visitors: 0, returning_visitors: 0, new_visitors: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('last_seen_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [returningOnly, setReturningOnly] = useState(false);

  const fetchVisitors = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      site_id: siteId,
      page: page.toString(),
      page_size: '50',
      sort,
      order,
    });
    if (search) params.set('search', search);
    if (deviceFilter) params.set('device', deviceFilter);
    if (countryFilter) params.set('country', countryFilter);
    if (returningOnly) params.set('returning', 'true');

    fetch(`/api/visitors?${params}`)
      .then(r => r.json())
      .then(data => {
        setVisitors(data.visitors || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId, page, sort, order, search, deviceFilter, countryFilter, returningOnly]);

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visitors</h1>
        <p className="text-sm text-muted-foreground">
          Browse individual visitor profiles and their activity history
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Visitors" value={stats.total_visitors.toLocaleString()} />
        <MetricCard title="Returning Visitors" value={stats.returning_visitors.toLocaleString()} />
        <MetricCard title="New Visitors" value={stats.new_visitors.toLocaleString()} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search visitor ID..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary w-48"
        />
        <select
          value={deviceFilter}
          onChange={e => { setDeviceFilter(e.target.value); setPage(0); }}
          className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={returningOnly}
            onChange={e => { setReturningOnly(e.target.checked); setPage(0); }}
            className="rounded"
          />
          Returning only
        </label>
      </div>

      {/* Visitors Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Visitor</th>
                <th
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('total_sessions')}
                >
                  Sessions{sortIcon('total_sessions')}
                </th>
                <th
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('total_pageviews')}
                >
                  Pageviews{sortIcon('total_pageviews')}
                </th>
                <th
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('total_revenue')}
                >
                  Revenue{sortIcon('total_revenue')}
                </th>
                <th className="px-4 py-2 text-left font-medium">Source</th>
                <th className="px-4 py-2 text-left font-medium">Location</th>
                <th
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('first_seen_at')}
                >
                  First seen{sortIcon('first_seen_at')}
                </th>
                <th
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('last_seen_at')}
                >
                  Last seen{sortIcon('last_seen_at')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading visitors...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No visitors found. Visitor profiles are created when users visit your site with the tracking script installed.
                  </td>
                </tr>
              ) : (
                visitors.map(v => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/${siteId}/visitors/${v.visitor_id}`}
                        className="group flex items-center gap-2"
                      >
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
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {v.total_pageviews}
                    </td>
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
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatDate(v.first_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {timeAgo(v.last_seen_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Showing {page * 50 + 1}–{Math.min((page + 1) * 50, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
