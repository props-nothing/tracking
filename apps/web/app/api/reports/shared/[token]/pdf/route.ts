import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateReportPDF } from '@/lib/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createServiceClient();

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

  // Calculate date range
  const now = new Date();
  let fromDate: Date;

  switch (report.date_range_mode) {
    case 'last_7_days': fromDate = new Date(now.getTime() - 7 * 86400000); break;
    case 'last_30_days': fromDate = new Date(now.getTime() - 30 * 86400000); break;
    case 'last_90_days': fromDate = new Date(now.getTime() - 90 * 86400000); break;
    default: fromDate = new Date(now.getTime() - 30 * 86400000);
  }

  const dateRange = `${fromDate.toLocaleDateString()} — ${now.toLocaleDateString()}`;

  // Fetch events
  const { data: events } = await supabase
    .from('events')
    .select('event_type, visitor_hash, session_id, path, referrer_hostname, country_code, browser, engaged_time_ms, is_bounce, timestamp')
    .eq('site_id', report.site_id)
    .gte('timestamp', fromDate.toISOString())
    .lte('timestamp', now.toISOString());

  const evts = events || [];
  const pageviews = evts.filter((e) => e.event_type === 'pageview').length;
  const uniqueVisitors = new Set(evts.map((e) => e.visitor_hash)).size;
  const sessions = new Set(evts.map((e) => e.session_id)).size;
  const bounces = evts.filter((e) => e.is_bounce && e.event_type === 'pageview').length;
  const bounceRate = sessions > 0 ? Math.round((bounces / sessions) * 100) : 0;
  const viewsPerSession = sessions > 0 ? Math.round((pageviews / sessions) * 10) / 10 : 0;
  const engagedTimes = evts.filter((e) => e.engaged_time_ms).map((e) => e.engaged_time_ms!);
  const avgEngagedTime = engagedTimes.length > 0 ? Math.round(engagedTimes.reduce((a, b) => a + b, 0) / engagedTimes.length) : 0;

  // Breakdowns
  const pageCounts: Record<string, number> = {};
  evts.filter((e) => e.event_type === 'pageview').forEach((e) => {
    pageCounts[e.path] = (pageCounts[e.path] || 0) + 1;
  });

  const refCounts: Record<string, number> = {};
  evts.filter((e) => e.referrer_hostname).forEach((e) => {
    refCounts[e.referrer_hostname!] = (refCounts[e.referrer_hostname!] || 0) + 1;
  });

  const countryCounts: Record<string, number> = {};
  evts.filter((e) => e.country_code).forEach((e) => {
    countryCounts[e.country_code!] = (countryCounts[e.country_code!] || 0) + 1;
  });

  const browserCounts: Record<string, number> = {};
  evts.filter((e) => e.browser).forEach((e) => {
    browserCounts[e.browser!] = (browserCounts[e.browser!] || 0) + 1;
  });

  const pdfBuffer = await generateReportPDF({
    title: report.title || (report as any).sites?.name || 'Analytics Report',
    description: report.description || undefined,
    dateRange,
    logoUrl: report.logo_url || undefined,
    brandColor: report.brand_color || undefined,
    metrics: { pageviews, unique_visitors: uniqueVisitors, sessions, bounce_rate: bounceRate, views_per_session: viewsPerSession, avg_engaged_time: avgEngagedTime },
    topPages: Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })),
    topReferrers: Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })),
    topCountries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })),
    topBrowsers: Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count })),
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.title || 'report'}.pdf"`,
    },
  });
}
