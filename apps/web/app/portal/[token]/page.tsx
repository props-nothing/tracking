'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PortalSite {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  brand_color: string | null;
  report_token: string | null;
}

interface PortalData {
  title: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  sites: PortalSite[];
}

interface SiteStats {
  visitors: number;
  visitors_prev: number;
  pageviews: number;
  pageviews_prev: number;
  leads: number;
  leads_prev: number;
  timeseries: { date: string; visitors: number; pageviews: number }[];
}

type Period = 'today' | 'last_7_days' | 'last_30_days' | 'last_90_days';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Vandaag',
  last_7_days: 'Afgelopen 7 dagen',
  last_30_days: 'Afgelopen 30 dagen',
  last_90_days: 'Afgelopen 90 dagen',
};

const PERIOD_COMPARE_LABELS: Record<Period, string> = {
  today: 'vs gisteren',
  last_7_days: 'vs vorige 7 dagen',
  last_30_days: 'vs vorige 30 dagen',
  last_90_days: 'vs vorige 90 dagen',
};

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData | null>(null);
  const [stats, setStats] = useState<Record<string, SiteStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('last_7_days');
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [error, setError] = useState('');

  // Fetch dashboard metadata
  useEffect(() => {
    const qs = new URLSearchParams();
    if (savedPassword) qs.set('password', savedPassword);

    fetch(`/api/shared-dashboards/${token}?${qs.toString()}`)
      .then(async (res) => {
        if (res.status === 401) {
          setNeedsPassword(true);
          setLoading(false);
          return;
        }
        if (res.status === 403) {
          setNeedsPassword(true);
          setError('Onjuist wachtwoord');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError('Dashboard niet gevonden');
          setLoading(false);
          return;
        }
        const d = await res.json();
        setData(d);
        setNeedsPassword(false);
        setError('');
        setLoading(false);
      })
      .catch(() => {
        setError('Laden mislukt');
        setLoading(false);
      });
  }, [token, savedPassword]);

  // Fetch stats when dashboard loads or period changes
  useEffect(() => {
    if (!data || data.sites.length === 0) return;
    setStatsLoading(true);
    const qs = new URLSearchParams();
    qs.set('period', period);
    if (savedPassword) qs.set('password', savedPassword);

    fetch(`/api/shared-dashboards/${token}/stats?${qs.toString()}`)
      .then(async (res) => {
        if (res.ok) {
          const d = await res.json();
          setStats(d.sites || {});
        }
      })
      .catch(() => {/* stats are optional, degrade gracefully */})
      .finally(() => setStatsLoading(false));
  }, [data, token, savedPassword, period]);

  // Aggregate overview across all sites
  const overview = useMemo(() => {
    const siteValues = Object.values(stats);
    if (siteValues.length === 0) return null;
    return {
      visitors: siteValues.reduce((s, v) => s + v.visitors, 0),
      visitors_prev: siteValues.reduce((s, v) => s + v.visitors_prev, 0),
      pageviews: siteValues.reduce((s, v) => s + v.pageviews, 0),
      pageviews_prev: siteValues.reduce((s, v) => s + v.pageviews_prev, 0),
      leads: siteValues.reduce((s, v) => s + v.leads, 0),
      leads_prev: siteValues.reduce((s, v) => s + v.leads_prev, 0),
    };
  }, [stats]);

  // Loading
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Dashboard laden...</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white border border-slate-200 p-8 shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">Wachtwoord beveiligd</h1>
          <p className="text-sm text-slate-500">Dit dashboard vereist een wachtwoord.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord invoeren"
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSavedPassword(password);
            }}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={() => setSavedPassword(password)}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Openen
          </button>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-slate-900">Dashboard niet gevonden</h1>
          <p className="text-sm text-slate-500">{error || 'Dit dashboard bestaat niet of is verlopen.'}</p>
        </div>
      </div>
    );
  }

  const accentColor = data.brand_color || '#6366f1';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {data.logo_url && (
                <img
                  src={data.logo_url}
                  alt=""
                  className="h-10 w-10 rounded-lg object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">{data.title}</h1>
                {data.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{data.description}</p>
                )}
              </div>
            </div>
            {/* Period picker */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

     

      {/* Sites grid */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {data.sites.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Geen sites</h2>
            <p className="mt-2 text-sm text-slate-500">Er zijn nog geen sites aan dit dashboard toegevoegd.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.sites.map((site) => (
              <PortalSiteCard
                key={site.id}
                site={site}
                stats={stats[site.id]}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </main>

  
      
    </div>
  );
}

function PortalSiteCard({
  site,
  stats,
  accentColor,
}: {
  site: PortalSite;
  stats?: SiteStats;
  accentColor: string;
}) {
  const href = site.report_token ? `/report/${site.report_token}` : '#';
  const initial = site.name?.[0]?.toUpperCase() || '?';
  const siteColor = site.brand_color || accentColor;

  return (
    <Link
    target='_blank'
      href={href}
      className="group relative rounded-xl border bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300"
      style={{ borderLeftWidth: '3px', borderLeftColor: siteColor }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {site.logo_url ? (
          <img
            src={site.logo_url}
            alt=""
            className="h-10 w-10 rounded-lg object-contain shrink-0"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: siteColor }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
            {site.name}
          </h3>
          <p className="text-sm text-slate-500 truncate">{site.domain}</p>
        </div>
      </div>

      {/* Stats section */}
      {stats && (
        <div className="mt-4 space-y-3">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3">
            <StatMetric
              label="Bezoekers"
              value={stats.visitors}
              previous={stats.visitors_prev}
            />
            <StatMetric
              label="Leads"
              value={stats.leads}
              previous={stats.leads_prev}
            />
          </div>

          {/* Sparkline */}
          {stats.timeseries.length > 0 && (
            <Sparkline
              data={stats.timeseries.map((d) => d.visitors)}
              color={siteColor}
            />
          )}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-4 flex items-center text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
        <span>Rapport bekijken</span>
        <svg className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

/* ── Small helper components ──────────────────────────────────── */

function StatMetric({
  label,
  value,
  previous,
}: {
  label: string;
  value: number;
  previous: number;
}) {
  const pct = pctChange(value, previous);
  const isUp = pct > 0;
  const isDown = pct < 0;

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-lg font-bold text-slate-900">{fmt(value)}</span>
        {pct !== 0 && (
          <span
            className={`text-[11px] font-medium ${
              isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {isUp ? '+' : ''}
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function pctChange(value: number, previous: number): number {
  if (previous > 0) return Math.round(((value - previous) / previous) * 100);
  return value > 0 ? 100 : 0;
}

function OverviewMetric({
  label,
  value,
  previous,
}: {
  label: string;
  value: number;
  previous: number;
}) {
  const pct = pctChange(value, previous);
  const isUp = pct > 0;
  const isDown = pct < 0;

  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{fmt(value)}</span>
        {pct !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
              isUp
                ? 'bg-emerald-50 text-emerald-700'
                : isDown
                  ? 'bg-red-50 text-red-600'
                  : 'text-slate-400'
            }`}
          >
            {isUp ? '↑' : '↓'} {Math.abs(pct)}%
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-slate-400">
        vorige periode: {fmt(previous)}
      </p>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 200;
  const height = 32;
  const padding = 2;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;
  // Area fill (path closes at bottom)
  const areaD = `${pathD} L${width - padding},${height} L${padding},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: '32px' }}
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path
        d={areaD}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
