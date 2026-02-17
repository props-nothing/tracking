import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Public endpoint — shared report data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // Look up report by token
  const { data: report, error } = await supabase
    .from('shared_reports')
    .select('*, sites(name, domain)')
    .eq('token', token)
    .maybeSingle();

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Check expiry
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Report has expired' }, { status: 410 });
  }

  // Check password
  if (report.password_hash) {
    const password = request.nextUrl.searchParams.get('password');
    if (!password) {
      return NextResponse.json({ error: 'Password required', needs_password: true }, { status: 401 });
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hash !== report.password_hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }
  }

  // Calculate date range
  const now = new Date();
  let fromDate: Date;

  switch (report.date_range_mode) {
    case 'last_7_days': fromDate = new Date(now.getTime() - 7 * 86400000); break;
    case 'last_30_days': fromDate = new Date(now.getTime() - 30 * 86400000); break;
    case 'last_90_days': fromDate = new Date(now.getTime() - 90 * 86400000); break;
    case 'last_365_days': fromDate = new Date(now.getTime() - 365 * 86400000); break;
    case 'this_month': fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'last_month': fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); break;
    case 'custom': fromDate = report.date_from ? new Date(report.date_from) : new Date(now.getTime() - 30 * 86400000); break;
    default: fromDate = new Date(now.getTime() - 30 * 86400000);
  }

  // Fetch events
  const { data: events } = await supabase
    .from('events')
    .select('event_type, visitor_hash, session_id, path, referrer_hostname, country_code, browser, os, device_type, engaged_time_ms, is_bounce, timestamp, revenue')
    .eq('site_id', report.site_id)
    .gte('timestamp', fromDate.toISOString())
    .lte('timestamp', now.toISOString());

  if (!events || events.length === 0) {
    return NextResponse.json({
      site_name: (report as any).sites?.name,
      site_domain: (report as any).sites?.domain,
      report_name: report.title,
      description: report.description,
      logo_url: report.logo_url,
      brand_color: report.brand_color,
      metrics: { visitors: 0, pageviews: 0, sessions: 0, bounce_rate: 0, views_per_session: 0, avg_duration: 0 },
      timeseries: [],
      top_pages: [],
      top_referrers: [],
      browsers: [],
      countries: [],
    });
  }

  const pageviews = events.filter((e) => e.event_type === 'pageview').length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_hash)).size;
  const sessions = new Set(events.map((e) => e.session_id)).size;
  const bounces = events.filter((e) => e.is_bounce && e.event_type === 'pageview').length;
  const bounceRate = sessions > 0 ? Math.round((bounces / sessions) * 100) : 0;
  const viewsPerSession = sessions > 0 ? Math.round((pageviews / sessions) * 10) / 10 : 0;

  const hiddenMetrics = new Set(report.hidden_metrics || []);
  const visibleSections = new Set(report.visible_sections || []);

  // Calculate avg duration from engaged_time_ms
  const totalEngaged = events.reduce((sum, e) => sum + (e.engaged_time_ms || 0), 0);
  const avgDuration = sessions > 0 ? Math.round(totalEngaged / sessions / 1000) : 0;

  const result: Record<string, unknown> = {
    // Flat fields expected by the report page
    site_name: (report as any).sites?.name,
    site_domain: (report as any).sites?.domain,
    report_name: report.title,
    description: report.description,
    logo_url: report.logo_url,
    brand_color: report.brand_color,
    metrics: {
      ...(hiddenMetrics.has('pageviews') ? {} : { pageviews }),
      ...(hiddenMetrics.has('unique_visitors') ? {} : { visitors: uniqueVisitors }),
      ...(hiddenMetrics.has('sessions') ? {} : { sessions }),
      ...(hiddenMetrics.has('bounce_rate') ? {} : { bounce_rate: bounceRate }),
      ...(hiddenMetrics.has('views_per_session') ? {} : { views_per_session: viewsPerSession }),
      avg_duration: avgDuration,
    },
  };

  // Add sections based on visibility settings
  if (visibleSections.has('pages') || visibleSections.size === 0) {
    const pageCounts: Record<string, number> = {};
    events.filter((e) => e.event_type === 'pageview').forEach((e) => {
      pageCounts[e.path] = (pageCounts[e.path] || 0) + 1;
    });
    result.top_pages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([path, views]) => ({ path, views }));
  }

  if (visibleSections.has('referrers') || visibleSections.size === 0) {
    const refCounts: Record<string, number> = {};
    events.filter((e) => e.referrer_hostname).forEach((e) => {
      refCounts[e.referrer_hostname!] = (refCounts[e.referrer_hostname!] || 0) + 1;
    });
    result.top_referrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([source, visitors]) => ({ source, visitors }));
  }

  if (visibleSections.has('countries') || visibleSections.size === 0) {
    const countryCounts: Record<string, number> = {};
    events.filter((e) => e.country_code).forEach((e) => {
      countryCounts[e.country_code!] = (countryCounts[e.country_code!] || 0) + 1;
    });
    result.top_countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, visitors]) => ({ name, visitors }));
  }

  // Browsers (used by pie chart on report page)
  if (visibleSections.has('devices') || visibleSections.size === 0) {
    const browserCounts: Record<string, number> = {};
    events.filter((e) => e.browser).forEach((e) => {
      browserCounts[e.browser!] = (browserCounts[e.browser!] || 0) + 1;
    });
    result.browsers = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }

  // Timeseries (daily visitors + pageviews)
  if (visibleSections.has('chart') || visibleSections.size === 0) {
    const dayMap: Record<string, { visitors: Set<string>; pageviews: number }> = {};
    events.forEach((e) => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { visitors: new Set(), pageviews: 0 };
      dayMap[day].visitors.add(e.visitor_hash);
      if (e.event_type === 'pageview') dayMap[day].pageviews++;
    });
    result.timeseries = Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, visitors: d.visitors.size, pageviews: d.pageviews }));
  }

  // Rename fields for embed format compatibility
  if (request.nextUrl.searchParams.get('format') === 'embed') {
    const m = result.metrics as Record<string, unknown>;
    return NextResponse.json({
      visitors: m?.visitors ?? 0,
      pageviews: m?.pageviews ?? 0,
      timeseries: result.timeseries ?? [],
    });
  }

  return NextResponse.json(result);
}
