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
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
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

  if (!events) {
    return NextResponse.json({ report: { title: report.title, description: report.description }, data: null });
  }

  const pageviews = events.filter((e) => e.event_type === 'pageview').length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_hash)).size;
  const sessions = new Set(events.map((e) => e.session_id)).size;
  const bounces = events.filter((e) => e.is_bounce && e.event_type === 'pageview').length;
  const bounceRate = sessions > 0 ? Math.round((bounces / sessions) * 100) : 0;
  const viewsPerSession = sessions > 0 ? Math.round((pageviews / sessions) * 10) / 10 : 0;

  const hiddenMetrics = new Set(report.hidden_metrics || []);
  const visibleSections = new Set(report.visible_sections || []);

  const result: Record<string, unknown> = {
    report: {
      title: report.title,
      description: report.description,
      logo_url: report.logo_url,
      brand_color: report.brand_color,
      site_name: (report as any).sites?.name,
      site_domain: (report as any).sites?.domain,
    },
    metrics: {
      ...(hiddenMetrics.has('pageviews') ? {} : { pageviews }),
      ...(hiddenMetrics.has('unique_visitors') ? {} : { unique_visitors: uniqueVisitors }),
      ...(hiddenMetrics.has('sessions') ? {} : { sessions }),
      ...(hiddenMetrics.has('bounce_rate') ? {} : { bounce_rate: bounceRate }),
      ...(hiddenMetrics.has('views_per_session') ? {} : { views_per_session: viewsPerSession }),
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
      .map(([path, count]) => ({ path, count }));
  }

  if (visibleSections.has('referrers') || visibleSections.size === 0) {
    const refCounts: Record<string, number> = {};
    events.filter((e) => e.referrer_hostname).forEach((e) => {
      refCounts[e.referrer_hostname!] = (refCounts[e.referrer_hostname!] || 0) + 1;
    });
    result.top_referrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }

  if (visibleSections.has('countries') || visibleSections.size === 0) {
    const countryCounts: Record<string, number> = {};
    events.filter((e) => e.country_code).forEach((e) => {
      countryCounts[e.country_code!] = (countryCounts[e.country_code!] || 0) + 1;
    });
    result.top_countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([country, count]) => ({ country, count }));
  }

  return NextResponse.json(result);
}
