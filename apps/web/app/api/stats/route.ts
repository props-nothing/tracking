import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const period = searchParams.get('period') || 'last_30_days';
  const metric = searchParams.get('metric'); // Optional specific metric

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  // Calculate date range
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
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_30_days':
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last_90_days':
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'last_365_days':
      fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const fromStr = fromDate.toISOString();
  const toStr = now.toISOString();

  // Core metrics
  const { data: events } = await supabase
    .from('events')
    .select('event_type, visitor_hash, session_id, path, referrer_hostname, country_code, browser, os, device_type, engaged_time_ms, is_bounce, timestamp')
    .eq('site_id', siteId)
    .gte('timestamp', fromStr)
    .lte('timestamp', toStr);

  if (!events) {
    return NextResponse.json({
      pageviews: 0,
      unique_visitors: 0,
      sessions: 0,
      avg_session_duration: 0,
      bounce_rate: 0,
      views_per_session: 0,
      avg_engaged_time: 0,
      top_pages: [],
      top_referrers: [],
      top_countries: [],
      top_browsers: [],
      top_os: [],
      top_devices: [],
      timeseries: [],
    });
  }

  const pageviews = events.filter((e) => e.event_type === 'pageview').length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_hash)).size;
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;
  const bounces = events.filter((e) => e.is_bounce && e.event_type === 'pageview').length;
  const bounceRate = uniqueSessions > 0 ? Math.round((bounces / uniqueSessions) * 100) : 0;
  const viewsPerSession = uniqueSessions > 0 ? Math.round((pageviews / uniqueSessions) * 10) / 10 : 0;

  const engagedTimes = events.filter((e) => e.engaged_time_ms).map((e) => e.engaged_time_ms!);
  const avgEngagedTime = engagedTimes.length > 0
    ? Math.round(engagedTimes.reduce((a, b) => a + b, 0) / engagedTimes.length)
    : 0;

  // Top pages
  const pageCounts: Record<string, number> = {};
  events.filter((e) => e.event_type === 'pageview').forEach((e) => {
    pageCounts[e.path] = (pageCounts[e.path] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Top referrers
  const refCounts: Record<string, number> = {};
  events.filter((e) => e.referrer_hostname).forEach((e) => {
    refCounts[e.referrer_hostname!] = (refCounts[e.referrer_hostname!] || 0) + 1;
  });
  const topReferrers = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  // Top countries
  const countryCounts: Record<string, number> = {};
  events.filter((e) => e.country_code).forEach((e) => {
    countryCounts[e.country_code!] = (countryCounts[e.country_code!] || 0) + 1;
  });
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  // Top browsers
  const browserCounts: Record<string, number> = {};
  events.filter((e) => e.browser).forEach((e) => {
    browserCounts[e.browser!] = (browserCounts[e.browser!] || 0) + 1;
  });
  const topBrowsers = Object.entries(browserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([browser, count]) => ({ browser, count }));

  // Top OS
  const osCounts: Record<string, number> = {};
  events.filter((e) => e.os).forEach((e) => {
    osCounts[e.os!] = (osCounts[e.os!] || 0) + 1;
  });
  const topOS = Object.entries(osCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([os, count]) => ({ os, count }));

  // Device types
  const deviceCounts: Record<string, number> = {};
  events.filter((e) => e.device_type).forEach((e) => {
    deviceCounts[e.device_type!] = (deviceCounts[e.device_type!] || 0) + 1;
  });
  const topDevices = Object.entries(deviceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  // Time series — group by day
  const tsMap: Record<string, { pageviews: number; visitors: Set<string> }> = {};
  events.filter((e) => e.event_type === 'pageview').forEach((e) => {
    const day = e.timestamp.split('T')[0];
    if (!tsMap[day]) tsMap[day] = { pageviews: 0, visitors: new Set() };
    tsMap[day].pageviews++;
    tsMap[day].visitors.add(e.visitor_hash);
  });
  const timeseries = Object.entries(tsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      pageviews: data.pageviews,
      visitors: data.visitors.size,
    }));

  return NextResponse.json({
    pageviews,
    unique_visitors: uniqueVisitors,
    sessions: uniqueSessions,
    avg_session_duration: avgEngagedTime,
    bounce_rate: bounceRate,
    views_per_session: viewsPerSession,
    avg_engaged_time: avgEngagedTime,
    top_pages: topPages,
    top_referrers: topReferrers,
    top_countries: topCountries,
    top_browsers: topBrowsers,
    top_os: topOS,
    top_devices: topDevices,
    timeseries,
  });
}
