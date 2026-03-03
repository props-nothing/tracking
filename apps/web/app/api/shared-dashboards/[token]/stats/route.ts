import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/query-helpers';

/**
 * Public endpoint — returns quick stats for every site in a shared dashboard.
 * Auth is via the dashboard token (same as the portal page uses).
 *
 * Query params:
 *   period = today | last_7_days | last_30_days | last_90_days  (default: last_7_days)
 *   password = optional dashboard password
 *
 * Returns: { period, sites: Record<siteId, { visitors, visitors_prev,
 *   pageviews, pageviews_prev, leads, leads_prev,
 *   timeseries: { date, visitors, pageviews }[] }> }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await createServiceClient();

  // ── Validate dashboard token ──────────────────────────────────
  const { data: dashboard, error } = await db
    .from('shared_dashboards')
    .select(
      'id, password_hash, expires_at, shared_dashboard_sites(site_id)',
    )
    .eq('token', token)
    .maybeSingle();

  if (error || !dashboard) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (dashboard.expires_at && new Date(dashboard.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  // Password gate (same logic as the data endpoint)
  if (dashboard.password_hash) {
    const password = request.nextUrl.searchParams.get('password');
    if (!password) {
      return NextResponse.json(
        { error: 'Password required', needs_password: true },
        { status: 401 },
      );
    }
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(password),
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hash !== dashboard.password_hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }
  }

  // ── Collect site IDs from dashboard ───────────────────────────
  const siteIds: string[] = (dashboard.shared_dashboard_sites || []).map(
    (s: any) => s.site_id,
  );

  if (siteIds.length === 0) {
    return NextResponse.json({ period: 'last_7_days', sites: {} });
  }

  // ── Period handling ───────────────────────────────────────────
  const periodParam = request.nextUrl.searchParams.get('period') || 'last_7_days';
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  let days: number;
  let period: string;
  switch (periodParam) {
    case 'today':
      days = 1;
      period = 'today';
      break;
    case 'last_30_days':
      days = 30;
      period = 'last_30_days';
      break;
    case 'last_90_days':
      days = 90;
      period = 'last_90_days';
      break;
    default:
      days = 7;
      period = 'last_7_days';
  }

  // Current period: [currentFrom .. now]
  const currentFrom = new Date(startOfToday.getTime() - (days - 1) * 86400000);
  // Previous period: same length window right before currentFrom
  const prevFrom = new Date(currentFrom.getTime() - days * 86400000);
  const prevTo = new Date(currentFrom.getTime() - 1);

  const currentFromStr = currentFrom.toISOString();
  const currentToStr = now.toISOString();
  const prevFromStr = prevFrom.toISOString();
  const prevToStr = prevTo.toISOString();

  // ── Query per site (in parallel) ──────────────────────────────
  const result: Record<
    string,
    {
      visitors: number;
      visitors_prev: number;
      pageviews: number;
      pageviews_prev: number;
      leads: number;
      leads_prev: number;
      timeseries: { date: string; visitors: number; pageviews: number }[];
    }
  > = {};

  await Promise.all(
    siteIds.map(async (siteId) => {
      // Events current period
      const currentEvents = await fetchAll((from, to) =>
        db
          .from('events')
          .select('visitor_hash, event_type, timestamp')
          .eq('site_id', siteId)
          .eq('event_type', 'pageview')
          .gte('timestamp', currentFromStr)
          .lte('timestamp', currentToStr)
          .range(from, to),
      );

      // Events previous period
      const prevEvents = await fetchAll((from, to) =>
        db
          .from('events')
          .select('visitor_hash, event_type')
          .eq('site_id', siteId)
          .eq('event_type', 'pageview')
          .gte('timestamp', prevFromStr)
          .lte('timestamp', prevToStr)
          .range(from, to),
      );

      // Leads current period
      const { count: leadsCurrent } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .gte('created_at', currentFromStr)
        .lte('created_at', currentToStr);

      // Leads previous period
      const { count: leadsPrev } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .gte('created_at', prevFromStr)
        .lte('created_at', prevToStr);

      // Current visitors / pageviews
      const visitors = new Set(currentEvents.map((e) => e.visitor_hash)).size;
      const pageviews = currentEvents.length;

      // Previous visitors / pageviews
      const visitorsPrev = new Set(prevEvents.map((e) => e.visitor_hash)).size;
      const pageviewsPrev = prevEvents.length;

      // Timeseries (daily or hourly for today)
      const isHourly = period === 'today';
      let timeseries: { date: string; visitors: number; pageviews: number }[];

      if (isHourly) {
        const bucketMap: Record<string, { pageviews: number; visitors: Set<string> }> = {};
        for (let h = 0; h < 24; h++) {
          const d = new Date(startOfToday.getTime() + h * 3600000);
          bucketMap[d.toISOString().slice(0, 13)] = { pageviews: 0, visitors: new Set() };
        }
        for (const e of currentEvents) {
          const hour = e.timestamp.slice(0, 13);
          if (!bucketMap[hour]) bucketMap[hour] = { pageviews: 0, visitors: new Set() };
          bucketMap[hour].pageviews++;
          bucketMap[hour].visitors.add(e.visitor_hash);
        }
        timeseries = Object.entries(bucketMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, d]) => ({ date, visitors: d.visitors.size, pageviews: d.pageviews }));
      } else {
        const bucketMap: Record<string, { pageviews: number; visitors: Set<string> }> = {};
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(startOfToday.getTime() - i * 86400000);
          bucketMap[d.toISOString().slice(0, 10)] = { pageviews: 0, visitors: new Set() };
        }
        for (const e of currentEvents) {
          const day = e.timestamp.slice(0, 10);
          if (!bucketMap[day]) bucketMap[day] = { pageviews: 0, visitors: new Set() };
          bucketMap[day].pageviews++;
          bucketMap[day].visitors.add(e.visitor_hash);
        }
        timeseries = Object.entries(bucketMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, d]) => ({ date, visitors: d.visitors.size, pageviews: d.pageviews }));
      }

      result[siteId] = {
        visitors,
        visitors_prev: visitorsPrev,
        pageviews,
        pageviews_prev: pageviewsPrev,
        leads: leadsCurrent ?? 0,
        leads_prev: leadsPrev ?? 0,
        timeseries,
      };
    }),
  );

  return NextResponse.json({ period, sites: result });
}
