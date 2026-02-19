'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

interface VisitorProfile {
  visitor_id: string;
  site_id: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
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
  last_language: string | null;
  last_screen_width: number | null;
  last_screen_height: number | null;
  custom_props: Record<string, any>;
}

interface SessionEvent {
  id: number;
  event_type: string;
  event_name: string | null;
  event_data: Record<string, any>;
  path: string;
  page_title: string | null;
  url: string;
  referrer_hostname: string | null;
  utm_source: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  scroll_depth_pct: number | null;
  time_on_page_ms: number | null;
  engaged_time_ms: number | null;
  form_id: string | null;
  ecommerce_action: string | null;
  order_id: string | null;
  revenue: number | null;
  currency: string | null;
  error_message: string | null;
  is_entry: boolean;
  is_exit: boolean;
  timestamp: string;
  session_id: string;
}

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number;
  engaged_time_ms: number;
  pageviews: number;
  events_count: number;
  is_bounce: boolean;
  entry_path: string;
  exit_path: string;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  total_revenue: number;
  events: SessionEvent[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return '< 1s';
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

function daysBetween(a: string, b: string): number {
  return Math.floor(
    Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000
  );
}

function getEventIcon(event: SessionEvent): string {
  switch (event.event_type) {
    case 'pageview': return '📄';
    case 'custom': return '🎯';
    case 'form_submit': return '📝';
    case 'form_abandon': return '📝';
    case 'outbound_click': return '↗️';
    case 'file_download': return '📥';
    case 'ecommerce': return '🛒';
    case 'error': return '🐛';
    case 'rage_click': return '😤';
    case 'dead_click': return '👆';
    case 'copy': return '📋';
    case 'print': return '🖨️';
    case 'element_visible': return '👁️';
    default: return '⚡';
  }
}

function getEventLabel(event: SessionEvent): string {
  switch (event.event_type) {
    case 'pageview':
      return event.page_title || event.path;
    case 'custom':
      return event.event_name || 'Custom Event';
    case 'form_submit':
      return `Form submitted${event.form_id ? ` (${event.form_id})` : ''}`;
    case 'form_abandon':
      return `Form abandoned${event.form_id ? ` (${event.form_id})` : ''}`;
    case 'outbound_click':
      return `Clicked: ${event.event_data?.url || event.event_data?.href || 'external link'}`;
    case 'file_download':
      return `Downloaded: ${event.event_data?.filename || event.event_data?.url || 'file'}`;
    case 'ecommerce':
      const action = event.ecommerce_action || 'action';
      const amount = event.revenue ? ` (${event.currency || '€'}${event.revenue})` : '';
      return `${action.replace(/_/g, ' ')}${event.order_id ? ` #${event.order_id}` : ''}${amount}`;
    case 'error':
      return event.error_message || 'JavaScript error';
    case 'rage_click':
      return `Rage click on ${event.path}`;
    case 'dead_click':
      return `Dead click on ${event.path}`;
    case 'copy':
      return 'Copied text';
    case 'print':
      return 'Printed page';
    case 'element_visible':
      return `Saw element: ${event.event_data?.selector || event.event_data?.element || ''}`;
    default:
      return event.event_type;
  }
}

function getEventTypeColor(type: string): string {
  switch (type) {
    case 'pageview': return 'bg-blue-500';
    case 'custom': return 'bg-purple-500';
    case 'form_submit': return 'bg-green-500';
    case 'form_abandon': return 'bg-yellow-500';
    case 'ecommerce': return 'bg-emerald-500';
    case 'error': return 'bg-red-500';
    case 'rage_click': return 'bg-orange-500';
    case 'dead_click': return 'bg-amber-500';
    default: return 'bg-gray-500';
  }
}

function getDeviceIcon(device: string | null): string {
  switch (device) {
    case 'mobile': return '📱';
    case 'tablet': return '📲';
    default: return '🖥️';
  }
}

function getCountryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(c => 0x1F1E6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function VisitorProfilePage({
  params,
}: {
  params: Promise<{ siteId: string; visitorId: string }>;
}) {
  const { siteId, visitorId } = use(params);
  const [visitor, setVisitor] = useState<VisitorProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/visitors/${visitorId}?site_id=${siteId}&sessions_limit=30&events_limit=500`)
      .then(r => r.json())
      .then(data => {
        setVisitor(data.visitor || null);
        setSessions(data.sessions || []);
        // Auto-expand first session
        if (data.sessions?.length > 0) {
          setExpandedSessions(new Set([data.sessions[0].id]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId, visitorId]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSessions(new Set(sessions.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSessions(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading visitor profile...</div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-sm text-muted-foreground">Visitor not found</div>
        <Link
          href={`/dashboard/${siteId}/visitors`}
          className="text-sm text-primary hover:underline"
        >
          ← Back to visitors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/${siteId}/visitors`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to visitors
      </Link>

      {/* Visitor Header */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Visitor identity */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">
              {getDeviceIcon(visitor.last_device_type)}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {visitor.last_browser || 'Unknown'} on {visitor.last_os || 'Unknown'}
              </h1>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                ID: {visitor.visitor_id}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {visitor.last_country_code && (
                  <span className="inline-flex items-center gap-1">
                    {getCountryFlag(visitor.last_country_code)}
                    {visitor.last_city ? `${visitor.last_city}, ${visitor.last_country_code}` : visitor.last_country_code}
                  </span>
                )}
                {visitor.last_device_type && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {visitor.last_device_type}
                  </span>
                )}
                {visitor.last_screen_width && visitor.last_screen_height && (
                  <span className="text-xs">
                    {visitor.last_screen_width}×{visitor.last_screen_height}
                  </span>
                )}
                {visitor.last_language && (
                  <span className="text-xs">{visitor.last_language}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Key stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{visitor.total_sessions}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{visitor.total_pageviews}</div>
              <div className="text-xs text-muted-foreground">Pageviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{visitor.total_events}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatDuration(visitor.total_engaged_time_ms || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Engaged Time</div>
            </div>
          </div>
        </div>

        {/* Attribution & Timeline */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">First Source</div>
            <div className="text-sm font-medium mt-0.5">
              {visitor.first_utm_source
                ? `${visitor.first_utm_source}${visitor.first_utm_medium ? ` / ${visitor.first_utm_medium}` : ''}`
                : visitor.first_referrer_hostname || 'Direct'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">First Entry Page</div>
            <div className="text-sm font-medium mt-0.5 truncate" title={visitor.first_entry_path || '—'}>
              {visitor.first_entry_path || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">First Seen</div>
            <div className="text-sm font-medium mt-0.5">
              {visitor.first_seen_at ? formatDate(visitor.first_seen_at) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last Seen</div>
            <div className="text-sm font-medium mt-0.5">
              {visitor.last_seen_at ? (
                <>
                  {timeAgo(visitor.last_seen_at)}
                  {visitor.first_seen_at && visitor.last_seen_at && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({daysBetween(visitor.first_seen_at, visitor.last_seen_at)}d span)
                    </span>
                  )}
                </>
              ) : '—'}
            </div>
          </div>
          {visitor.total_revenue > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
              <div className="text-sm font-medium mt-0.5 text-green-600 dark:text-green-400">
                €{Number(visitor.total_revenue).toFixed(2)}
              </div>
            </div>
          )}
          {visitor.first_utm_campaign && (
            <div>
              <div className="text-xs text-muted-foreground">Campaign</div>
              <div className="text-sm font-medium mt-0.5">{visitor.first_utm_campaign}</div>
            </div>
          )}
        </div>

        {/* Custom Properties */}
        {visitor.custom_props && Object.keys(visitor.custom_props).length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="text-xs text-muted-foreground mb-2">Custom Properties</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(visitor.custom_props).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs"
                >
                  <span className="font-medium">{key}:</span>
                  <span className="ml-1">{String(value)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Session History</h2>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="rounded-md border px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="rounded-md border px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No sessions found for this visitor.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => {
              const isExpanded = expandedSessions.has(session.id);
              const dayGap = idx < sessions.length - 1
                ? daysBetween(session.started_at, sessions[idx + 1].started_at)
                : 0;

              return (
                <div key={session.id}>
                  {/* Day gap indicator between sessions */}
                  {idx > 0 && dayGap > 0 && (
                    <div className="flex items-center justify-center py-2 mb-3">
                      <div className="border-t flex-1" />
                      <span className="px-3 text-xs text-muted-foreground bg-background">
                        {dayGap} day{dayGap !== 1 ? 's' : ''} later
                      </span>
                      <div className="border-t flex-1" />
                    </div>
                  )}

                  <div className="rounded-lg border bg-card overflow-hidden">
                    {/* Session Header */}
                    <button
                      onClick={() => toggleSession(session.id)}
                      className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            Session #{sessions.length - idx}
                            {session.is_bounce && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                                Bounce
                              </span>
                            )}
                            {session.total_revenue > 0 && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                                €{Number(session.total_revenue).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(session.started_at)}
                            {session.referrer_hostname && (
                              <span> · from {session.referrer_hostname}</span>
                            )}
                            {session.utm_source && (
                              <span> · {session.utm_source}{session.utm_medium ? `/${session.utm_medium}` : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {session.country_code && (
                          <span>{getCountryFlag(session.country_code)}</span>
                        )}
                        <span>{session.pageviews} page{session.pageviews !== 1 ? 's' : ''}</span>
                        <span>{formatDuration(session.duration_ms)}</span>
                        <span>{session.entry_path}</span>
                      </div>
                    </button>

                    {/* Session Events (expanded) */}
                    {isExpanded && session.events && (
                      <div className="border-t">
                        {/* Session summary bar */}
                        <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
                          <span>{session.pageviews} pageview{session.pageviews !== 1 ? 's' : ''}</span>
                          <span>{session.events_count} event{session.events_count !== 1 ? 's' : ''}</span>
                          <span>Duration: {formatDuration(session.duration_ms)}</span>
                          <span>Engaged: {formatDuration(session.engaged_time_ms)}</span>
                          <span>Entry: {session.entry_path}</span>
                          <span>Exit: {session.exit_path}</span>
                        </div>

                        {/* Event Timeline */}
                        <div className="relative px-4 py-3">
                          {/* Vertical timeline line */}
                          <div className="absolute left-[29px] top-3 bottom-3 w-px bg-border" />

                          <div className="space-y-0">
                            {session.events.map((event, eventIdx) => (
                              <div
                                key={event.id}
                                className="relative flex items-start gap-3 py-1.5 group"
                              >
                                {/* Timeline dot */}
                                <div className="relative z-10 flex-shrink-0">
                                  <div
                                    className={`h-3 w-3 rounded-full border-2 border-background ${getEventTypeColor(event.event_type)}`}
                                  />
                                </div>

                                {/* Event content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{getEventIcon(event)}</span>
                                    <span className="text-sm font-medium truncate">
                                      {getEventLabel(event)}
                                    </span>
                                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                                      {formatTime(event.timestamp)}
                                    </span>
                                  </div>

                                  {/* Event details */}
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    {event.event_type === 'pageview' && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {event.path}
                                      </span>
                                    )}
                                    {event.time_on_page_ms != null && event.time_on_page_ms > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        ⏱️ {formatDuration(event.time_on_page_ms)}
                                      </span>
                                    )}
                                    {event.scroll_depth_pct != null && event.scroll_depth_pct > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        📜 {event.scroll_depth_pct}%
                                      </span>
                                    )}
                                    {event.revenue != null && event.revenue > 0 && (
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        {event.currency || '€'}{event.revenue}
                                      </span>
                                    )}
                                    {event.event_type === 'error' && event.error_message && (
                                      <span className="text-xs text-red-500 truncate max-w-xs" title={event.error_message}>
                                        {event.error_message}
                                      </span>
                                    )}
                                    {event.event_type === 'custom' && event.event_data && Object.keys(event.event_data).length > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {JSON.stringify(event.event_data).slice(0, 80)}
                                      </span>
                                    )}
                                    {event.is_entry && (
                                      <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                        entry
                                      </span>
                                    )}
                                    {event.is_exit && (
                                      <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                        exit
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
