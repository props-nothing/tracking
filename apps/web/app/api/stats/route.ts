import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function getDateRange(period: string) {
  const now = new Date();
  let fromDate: Date;
  switch (period) {
    case 'today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case 'last_7_days':
      fromDate = new Date(now.getTime() - 7 * 86400000);
      break;
    case 'last_30_days':
      fromDate = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'last_90_days':
      fromDate = new Date(now.getTime() - 90 * 86400000);
      break;
    case 'last_365_days':
      fromDate = new Date(now.getTime() - 365 * 86400000);
      break;
    default:
      fromDate = new Date(now.getTime() - 30 * 86400000);
  }
  return { fromStr: fromDate.toISOString(), toStr: now.toISOString() };
}

function countBy<T>(arr: T[], keyFn: (item: T) => string | null | undefined) {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1]);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const period = searchParams.get('period') || 'last_30_days';
  const metric = searchParams.get('metric');

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  // Verify user has access to this site
  const { data: ownedSite } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ownedSite) {
    const { data: membership } = await supabase
      .from('site_members')
      .select('role')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Use service client for data queries (auth already verified above)
  const db = await createServiceClient();
  const { fromStr, toStr } = getDateRange(period);

  // --- Ecommerce metric ---
  if (metric === 'ecommerce') {
    const { data: events } = await db
      .from('events')
      .select('event_type, ecommerce_action, order_id, revenue, ecommerce_items, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'ecommerce')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);

    const evts = events || [];
    const purchases = evts.filter((e) => e.ecommerce_action === 'purchase');
    const totalRevenue = purchases.reduce((s, e) => s + (e.revenue || 0), 0);
    const totalOrders = new Set(purchases.map((e) => e.order_id).filter(Boolean)).size || purchases.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products from ecommerce_items
    const productMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const e of purchases) {
      const items = Array.isArray(e.ecommerce_items) ? e.ecommerce_items : [];
      for (const item of items) {
        const name = item.name || item.id || 'Unknown';
        if (!productMap[name]) productMap[name] = { revenue: 0, quantity: 0 };
        productMap[name].revenue += item.price || 0;
        productMap[name].quantity += item.quantity || 1;
      }
    }
    const topProducts = Object.entries(productMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 20)
      .map(([name, data]) => ({ name, ...data }));

    // Revenue timeseries
    const revMap: Record<string, number> = {};
    for (const e of purchases) {
      const day = e.timestamp.split('T')[0];
      revMap[day] = (revMap[day] || 0) + (e.revenue || 0);
    }
    const revenueTimeseries = Object.entries(revMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: avgOrderValue,
      top_products: topProducts,
      revenue_timeseries: revenueTimeseries,
    });
  }

  // --- Errors metric ---
  if (metric === 'errors') {
    const { data: events } = await db
      .from('events')
      .select('error_message, error_source, error_line, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'error')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .order('timestamp', { ascending: false });

    const evts = events || [];
    const errorMap: Record<string, { error_message: string; error_source: string; error_line: number | null; count: number; last_seen: string }> = {};
    for (const e of evts) {
      const key = `${e.error_message || ''}|${e.error_source || ''}|${e.error_line || ''}`;
      if (!errorMap[key]) {
        errorMap[key] = {
          error_message: e.error_message || 'Unknown error',
          error_source: e.error_source || '',
          error_line: e.error_line,
          count: 0,
          last_seen: e.timestamp,
        };
      }
      errorMap[key].count++;
    }
    const errors = Object.values(errorMap).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      errors,
      total_errors: evts.length,
    });
  }

  // --- Events (custom) metric ---
  if (metric === 'events') {
    const { data: events } = await db
      .from('events')
      .select('event_name, event_data, visitor_hash, path, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'custom')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .order('timestamp', { ascending: false });

    const evts = events || [];
    const eventMap: Record<string, { count: number; visitors: Set<string> }> = {};
    for (const e of evts) {
      const name = e.event_name || 'unnamed';
      if (!eventMap[name]) eventMap[name] = { count: 0, visitors: new Set() };
      eventMap[name].count++;
      eventMap[name].visitors.add(e.visitor_hash);
    }
    const customEvents = Object.entries(eventMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([event_name, data]) => ({
        event_name,
        count: data.count,
        unique_visitors: data.visitors.size,
      }));

    const recentEvents = evts.slice(0, 50).map((e) => ({
      event_name: e.event_name,
      event_data: e.event_data,
      timestamp: e.timestamp,
      path: e.path,
    }));

    return NextResponse.json({
      custom_events: customEvents,
      recent_events: recentEvents,
    });
  }

  // --- Retention metric ---
  if (metric === 'retention') {
    // Build weekly cohorts from sessions
    const { data: sessions } = await db
      .from('sessions')
      .select('visitor_hash, started_at')
      .eq('site_id', siteId)
      .gte('started_at', fromStr)
      .lte('started_at', toStr)
      .order('started_at', { ascending: true });

    const sess = sessions || [];
    if (sess.length === 0) {
      return NextResponse.json({ cohorts: [] });
    }

    // Group sessions by visitor and find first-seen week
    const visitorFirstWeek: Record<string, number> = {};
    const visitorActiveWeeks: Record<string, Set<number>> = {};
    const startMs = new Date(fromStr).getTime();

    for (const s of sess) {
      const weekNum = Math.floor((new Date(s.started_at).getTime() - startMs) / (7 * 86400000));
      if (visitorFirstWeek[s.visitor_hash] === undefined) {
        visitorFirstWeek[s.visitor_hash] = weekNum;
      }
      if (!visitorActiveWeeks[s.visitor_hash]) visitorActiveWeeks[s.visitor_hash] = new Set();
      visitorActiveWeeks[s.visitor_hash].add(weekNum);
    }

    // Build cohorts
    const maxWeek = Math.max(...Object.values(visitorFirstWeek), 0);
    const numWeeks = Math.min(maxWeek + 1, 12);
    const cohorts: { label: string; total: number; periods: number[] }[] = [];

    for (let w = 0; w < numWeeks; w++) {
      const cohortVisitors = Object.entries(visitorFirstWeek)
        .filter(([, firstWeek]) => firstWeek === w)
        .map(([vh]) => vh);

      const weekDate = new Date(startMs + w * 7 * 86400000);
      const label = `Week of ${weekDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
      const periods: number[] = [];

      for (let p = 0; p <= numWeeks - w - 1; p++) {
        const retained = cohortVisitors.filter((vh) =>
          visitorActiveWeeks[vh]?.has(w + p)
        ).length;
        periods.push(cohortVisitors.length > 0 ? Math.round((retained / cohortVisitors.length) * 100) : 0);
      }

      cohorts.push({ label, total: cohortVisitors.length, periods });
    }

    return NextResponse.json({ cohorts });
  }

  // --- Default: overview stats ---
  const selectFields = 'event_type, event_name, visitor_hash, session_id, path, referrer_hostname, country_code, city, browser, os, device_type, engaged_time_ms, is_bounce, is_entry, is_exit, utm_source, utm_medium, utm_campaign, time_on_page_ms, timestamp';

  const { data: events } = await db
    .from('events')
    .select(selectFields)
    .eq('site_id', siteId)
    .gte('timestamp', fromStr)
    .lte('timestamp', toStr);

  if (!events) {
    return NextResponse.json({
      pageviews: 0, unique_visitors: 0, sessions: 0,
      avg_session_duration: 0, bounce_rate: 0, views_per_session: 0, avg_engaged_time: 0,
      top_pages: [], entry_pages: [], exit_pages: [],
      top_referrers: [], utm_sources: [], utm_mediums: [], utm_campaigns: [],
      top_countries: [], top_cities: [],
      top_browsers: [], top_os: [], top_devices: [],
      timeseries: [],
    });
  }

  const pvEvents = events.filter((e) => e.event_type === 'pageview');
  const pageviews = pvEvents.length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_hash)).size;
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;
  const bounces = pvEvents.filter((e) => e.is_bounce).length;
  const bounceRate = uniqueSessions > 0 ? Math.round((bounces / uniqueSessions) * 100) : 0;
  const viewsPerSession = uniqueSessions > 0 ? Math.round((pageviews / uniqueSessions) * 10) / 10 : 0;

  const engagedTimes = events.filter((e) => e.engaged_time_ms).map((e) => e.engaged_time_ms!);
  const avgEngagedTime = engagedTimes.length > 0
    ? Math.round(engagedTimes.reduce((a, b) => a + b, 0) / engagedTimes.length)
    : 0;

  // Top pages (enriched with unique_visitors, avg_time, bounce_rate)
  const pageGroups: Record<string, { count: number; visitors: Set<string>; times: number[]; bounces: number; sessions: Set<string> }> = {};
  for (const e of pvEvents) {
    if (!pageGroups[e.path]) pageGroups[e.path] = { count: 0, visitors: new Set(), times: [], bounces: 0, sessions: new Set() };
    const pg = pageGroups[e.path];
    pg.count++;
    pg.visitors.add(e.visitor_hash);
    pg.sessions.add(e.session_id);
    if (e.time_on_page_ms) pg.times.push(e.time_on_page_ms);
    if (e.is_bounce) pg.bounces++;
  }
  const topPages = Object.entries(pageGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([path, pg]) => ({
      path,
      count: pg.count,
      unique_visitors: pg.visitors.size,
      avg_time: pg.times.length > 0 ? Math.round(pg.times.reduce((a, b) => a + b, 0) / pg.times.length) : 0,
      bounce_rate: pg.sessions.size > 0 ? Math.round((pg.bounces / pg.sessions.size) * 100) : 0,
    }));

  // Entry / exit pages
  const entryPages = countBy(
    events.filter((e) => e.is_entry),
    (e) => e.path
  ).slice(0, 10).map(([path, count]) => ({ path, count }));

  const exitPages = countBy(
    events.filter((e) => e.is_exit),
    (e) => e.path
  ).slice(0, 10).map(([path, count]) => ({ path, count }));

  // Referrers
  const topReferrers = countBy(events, (e) => e.referrer_hostname)
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  // UTM breakdowns
  const utmSources = countBy(events, (e) => e.utm_source)
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));
  const utmMediums = countBy(events, (e) => e.utm_medium)
    .slice(0, 10)
    .map(([medium, count]) => ({ medium, count }));
  const utmCampaigns = countBy(events, (e) => e.utm_campaign)
    .slice(0, 10)
    .map(([campaign, count]) => ({ campaign, count }));

  // Geo
  const topCountries = countBy(events, (e) => e.country_code)
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));
  const topCities = countBy(events, (e) => e.city)
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  // Device breakdowns
  const topBrowsers = countBy(events, (e) => e.browser)
    .slice(0, 10)
    .map(([browser, count]) => ({ browser, count }));
  const topOS = countBy(events, (e) => e.os)
    .slice(0, 10)
    .map(([os, count]) => ({ os, count }));
  const topDevices = countBy(events, (e) => e.device_type)
    .map(([device, count]) => ({ device, count }));

  // Time series
  const tsMap: Record<string, { pageviews: number; visitors: Set<string> }> = {};
  for (const e of pvEvents) {
    const day = e.timestamp.split('T')[0];
    if (!tsMap[day]) tsMap[day] = { pageviews: 0, visitors: new Set() };
    tsMap[day].pageviews++;
    tsMap[day].visitors.add(e.visitor_hash);
  }
  const timeseries = Object.entries(tsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({ date, pageviews: d.pageviews, visitors: d.visitors.size }));

  return NextResponse.json({
    pageviews,
    unique_visitors: uniqueVisitors,
    sessions: uniqueSessions,
    avg_session_duration: avgEngagedTime,
    bounce_rate: bounceRate,
    views_per_session: viewsPerSession,
    avg_engaged_time: avgEngagedTime,
    top_pages: topPages,
    entry_pages: entryPages,
    exit_pages: exitPages,
    top_referrers: topReferrers,
    utm_sources: utmSources,
    utm_mediums: utmMediums,
    utm_campaigns: utmCampaigns,
    top_countries: topCountries,
    top_cities: topCities,
    top_browsers: topBrowsers,
    top_os: topOS,
    top_devices: topDevices,
    timeseries,
  });
}
