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

  // --- Date range: allow overrides via query params ---
  const now = new Date();
  const qFrom = request.nextUrl.searchParams.get('from');
  const qTo = request.nextUrl.searchParams.get('to');
  const qRange = request.nextUrl.searchParams.get('range');

  let fromDate: Date;
  let toDate: Date = qTo ? new Date(qTo + 'T23:59:59Z') : now;

  if (qFrom) {
    fromDate = new Date(qFrom + 'T00:00:00Z');
  } else if (qRange) {
    switch (qRange) {
      case 'today': fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'last_7_days': fromDate = new Date(now.getTime() - 7 * 86400000); break;
      case 'last_30_days': fromDate = new Date(now.getTime() - 30 * 86400000); break;
      case 'last_90_days': fromDate = new Date(now.getTime() - 90 * 86400000); break;
      case 'last_365_days': fromDate = new Date(now.getTime() - 365 * 86400000); break;
      case 'this_month': fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'last_month': fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
      default: fromDate = new Date(now.getTime() - 30 * 86400000);
    }
  } else {
    // Use report default
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
  }

  // --- Filters via query params ---
  const filterPage = request.nextUrl.searchParams.get('page');
  const filterReferrer = request.nextUrl.searchParams.get('referrer');
  const filterCountry = request.nextUrl.searchParams.get('country');
  const filterDevice = request.nextUrl.searchParams.get('device');
  const filterBrowser = request.nextUrl.searchParams.get('browser');
  const filterOs = request.nextUrl.searchParams.get('os');
  const filterUtmSource = request.nextUrl.searchParams.get('utm_source');
  const filterUtmMedium = request.nextUrl.searchParams.get('utm_medium');
  const filterUtmCampaign = request.nextUrl.searchParams.get('utm_campaign');

  // Fetch events — include UTM + page_title + is_entry/is_exit
  let query = supabase
    .from('events')
    .select('event_type, visitor_hash, session_id, path, page_title, referrer_hostname, country_code, country_name, browser, os, device_type, engaged_time_ms, is_bounce, is_entry, is_exit, timestamp, revenue, utm_source, utm_medium, utm_campaign')
    .eq('site_id', report.site_id)
    .gte('timestamp', fromDate.toISOString())
    .lte('timestamp', toDate.toISOString());

  if (filterPage) query = query.eq('path', filterPage);
  if (filterReferrer) query = query.eq('referrer_hostname', filterReferrer);
  if (filterCountry) query = query.eq('country_code', filterCountry);
  if (filterDevice) query = query.eq('device_type', filterDevice);
  if (filterBrowser) query = query.eq('browser', filterBrowser);
  if (filterOs) query = query.eq('os', filterOs);
  if (filterUtmSource) query = query.eq('utm_source', filterUtmSource);
  if (filterUtmMedium) query = query.eq('utm_medium', filterUtmMedium);
  if (filterUtmCampaign) query = query.eq('utm_campaign', filterUtmCampaign);

  const { data: events } = await query;

  const emptyResult = {
    site_name: (report as any).sites?.name,
    site_domain: (report as any).sites?.domain,
    report_name: report.title,
    description: report.description,
    logo_url: report.logo_url,
    brand_color: report.brand_color,
    date_from: fromDate.toISOString().slice(0, 10),
    date_to: toDate.toISOString().slice(0, 10),
    metrics: { visitors: 0, pageviews: 0, sessions: 0, bounce_rate: 0, views_per_session: 0, avg_duration: 0 },
    timeseries: [],
    top_pages: [],
    top_referrers: [],
    browsers: [],
    operating_systems: [],
    device_types: [],
    countries: [],
    entry_pages: [],
    exit_pages: [],
    utm_sources: [],
    utm_mediums: [],
    utm_campaigns: [],
  };

  if (!events || events.length === 0) {
    return NextResponse.json(emptyResult);
  }

  // --- Aggregate core metrics ---
  const pvEvents = events.filter((e) => e.event_type === 'pageview');
  const pageviews = pvEvents.length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_hash)).size;
  const sessionSet = new Set(events.map((e) => e.session_id));
  const sessions = sessionSet.size;

  // Fetch sessions for reliable bounce rate and duration
  const { data: sessRows } = await supabase
    .from('sessions')
    .select('id, duration_ms, is_bounce')
    .eq('site_id', report.site_id)
    .gte('started_at', fromDate.toISOString())
    .lte('started_at', toDate.toISOString());

  // Bounce rate from sessions table — event-level is_bounce is unreliable
  const bounces = (sessRows || []).filter((s) => s.is_bounce).length;
  const bounceRate = sessions > 0 ? Math.round((bounces / sessions) * 100) : 0;
  const viewsPerSession = sessions > 0 ? Math.round((pageviews / sessions) * 10) / 10 : 0;
  // Avg duration from sessions table (event-level engaged_time summing double-counts)
  const sessionDurations = (sessRows || []).filter((s) => s.duration_ms > 0).map((s) => s.duration_ms);
  const avgDuration = sessionDurations.length > 0
    ? Math.round(sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length / 1000)
    : 0;

  const hiddenMetrics = new Set(report.hidden_metrics || []);
  const visibleSections = new Set(report.visible_sections || []);
  const showSection = (key: string) => visibleSections.has(key) || visibleSections.size === 0;

  const result: Record<string, unknown> = {
    site_name: (report as any).sites?.name,
    site_domain: (report as any).sites?.domain,
    report_name: report.title,
    description: report.description,
    logo_url: report.logo_url,
    brand_color: report.brand_color,
    date_from: fromDate.toISOString().slice(0, 10),
    date_to: toDate.toISOString().slice(0, 10),
    metrics: {
      ...(hiddenMetrics.has('pageviews') ? {} : { pageviews }),
      ...(hiddenMetrics.has('unique_visitors') ? {} : { visitors: uniqueVisitors }),
      ...(hiddenMetrics.has('sessions') ? {} : { sessions }),
      ...(hiddenMetrics.has('bounce_rate') ? {} : { bounce_rate: bounceRate }),
      ...(hiddenMetrics.has('views_per_session') ? {} : { views_per_session: viewsPerSession }),
      avg_duration: avgDuration,
    },
  };

  // --- Helper for top-N aggregation ---
  function topN<T>(items: T[], keyFn: (item: T) => string | null | undefined, limit = 10) {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const key = keyFn(item);
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  // --- Top Pages ---
  if (showSection('pages')) {
    result.top_pages = topN(pvEvents, (e) => e.path, 20).map(([path, views]) => ({ path, views }));
  }

  // --- Top Referrers ---
  if (showSection('referrers')) {
    result.top_referrers = topN(events, (e) => e.referrer_hostname, 20).map(([source, visitors]) => ({ source, visitors }));
  }

  // --- Countries ---
  if (showSection('countries')) {
    const countryCounts: Record<string, { code: string; name: string; count: number }> = {};
    events.filter((e) => e.country_code).forEach((e) => {
      if (!countryCounts[e.country_code!]) {
        countryCounts[e.country_code!] = { code: e.country_code!, name: e.country_name || e.country_code!, count: 0 };
      }
      countryCounts[e.country_code!].count++;
    });
    result.countries = Object.values(countryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((c) => ({ code: c.code, name: c.name, visitors: c.count }));
  }

  // --- Browsers ---
  if (showSection('devices')) {
    result.browsers = topN(events, (e) => e.browser, 10).map(([name, value]) => ({ name, value }));

    // --- Operating Systems ---
    result.operating_systems = topN(events, (e) => e.os, 10).map(([name, value]) => ({ name, value }));

    // --- Device Types ---
    result.device_types = topN(events, (e) => e.device_type, 5).map(([name, value]) => ({ name, value }));
  }

  // --- Entry Pages ---
  if (showSection('pages')) {
    result.entry_pages = topN(events.filter((e) => e.is_entry), (e) => e.path, 10).map(([path, views]) => ({ path, views }));

    // --- Exit Pages ---
    result.exit_pages = topN(events.filter((e) => e.is_exit), (e) => e.path, 10).map(([path, views]) => ({ path, views }));
  }

  // --- UTM ---
  if (showSection('utm')) {
    result.utm_sources = topN(events, (e) => e.utm_source, 10).map(([name, visitors]) => ({ name, visitors }));
    result.utm_mediums = topN(events, (e) => e.utm_medium, 10).map(([name, visitors]) => ({ name, visitors }));
    result.utm_campaigns = topN(events, (e) => e.utm_campaign, 10).map(([name, visitors]) => ({ name, visitors }));
  }

  // --- Leads ---
  if (showSection('leads')) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, lead_name, lead_email, lead_phone, lead_company, lead_message, form_id, page_path, referrer_hostname, utm_source, utm_medium, utm_campaign, country_code, city, device_type, status, created_at')
      .eq('site_id', report.site_id)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    result.leads = leads || [];

    // Leads source breakdown
    const leadSourceCounts: Record<string, number> = {};
    const leadMediumCounts: Record<string, number> = {};
    const leadCampaignCounts: Record<string, number> = {};
    for (const lead of leads || []) {
      const src = (lead as any).utm_source || (lead as any).referrer_hostname || 'direct';
      leadSourceCounts[src] = (leadSourceCounts[src] || 0) + 1;
      if ((lead as any).utm_medium) leadMediumCounts[(lead as any).utm_medium] = (leadMediumCounts[(lead as any).utm_medium] || 0) + 1;
      if ((lead as any).utm_campaign) leadCampaignCounts[(lead as any).utm_campaign] = (leadCampaignCounts[(lead as any).utm_campaign] || 0) + 1;
    }
    result.lead_sources = Object.entries(leadSourceCounts).map(([source, count]) => ({ source, count })).sort((a, b) => (b as any).count - (a as any).count);
    result.lead_mediums = Object.entries(leadMediumCounts).map(([medium, count]) => ({ medium, count })).sort((a, b) => (b as any).count - (a as any).count);
    result.lead_campaigns = Object.entries(leadCampaignCounts).map(([campaign, count]) => ({ campaign, count })).sort((a, b) => (b as any).count - (a as any).count);
  }

  // --- Timeseries ---
  if (showSection('chart')) {
    // Determine effective period for granularity
    const effectiveRange = qRange || report.date_range_mode || 'last_30_days';
    const isHourly = effectiveRange === 'today';

    // Fetch leads for timeseries markers
    const { data: tsLeads } = await supabase
      .from('leads')
      .select('created_at')
      .eq('site_id', report.site_id)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (isHourly) {
      const bucketMap: Record<string, { visitors: Set<string>; pageviews: number; leads: number }> = {};
      const startHour = new Date(fromDate);
      startHour.setMinutes(0, 0, 0);
      for (let h = new Date(startHour); h <= toDate; h = new Date(h.getTime() + 3600000)) {
        const key = h.toISOString().slice(0, 13);
        bucketMap[key] = { visitors: new Set(), pageviews: 0, leads: 0 };
      }
      events.forEach((e) => {
        const key = new Date(e.timestamp).toISOString().slice(0, 13);
        if (!bucketMap[key]) bucketMap[key] = { visitors: new Set(), pageviews: 0, leads: 0 };
        bucketMap[key].visitors.add(e.visitor_hash);
        if (e.event_type === 'pageview') bucketMap[key].pageviews++;
      });
      for (const l of tsLeads || []) {
        const key = new Date(l.created_at).toISOString().slice(0, 13);
        if (bucketMap[key]) bucketMap[key].leads++;
      }
      result.timeseries = Object.entries(bucketMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({ date, visitors: d.visitors.size, pageviews: d.pageviews, leads: d.leads }));
    } else {
      const dayMap: Record<string, { visitors: Set<string>; pageviews: number; leads: number }> = {};
      // Fill all day slots
      const startDay = new Date(fromDate);
      startDay.setHours(0, 0, 0, 0);
      for (let d = new Date(startDay); d <= toDate; d = new Date(d.getTime() + 86400000)) {
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { visitors: new Set(), pageviews: 0, leads: 0 };
      }
      events.forEach((e) => {
        const day = new Date(e.timestamp).toISOString().slice(0, 10);
        if (!dayMap[day]) dayMap[day] = { visitors: new Set(), pageviews: 0, leads: 0 };
        dayMap[day].visitors.add(e.visitor_hash);
        if (e.event_type === 'pageview') dayMap[day].pageviews++;
      });
      for (const l of tsLeads || []) {
        const key = new Date(l.created_at).toISOString().slice(0, 10);
        if (dayMap[key]) dayMap[key].leads++;
      }
      result.timeseries = Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({ date, visitors: d.visitors.size, pageviews: d.pageviews, leads: d.leads }));
    }
  }

  // --- Embed format shortcut ---
  if (request.nextUrl.searchParams.get('format') === 'embed') {
    const m = result.metrics as Record<string, unknown>;
    return NextResponse.json({
      visitors: m?.visitors ?? 0,
      pageviews: m?.pageviews ?? 0,
      timeseries: result.timeseries ?? [],
    });
  }

  // --- AI Insights (if enabled for this shared report) ---
  if (report.show_ai_insights) {
    const { data: aiReport } = await supabase
      .from('ai_reports')
      .select('analysis, generated_at, period_start, period_end, model_used')
      .eq('site_id', report.site_id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aiReport?.analysis) {
      result.ai_analysis = typeof aiReport.analysis === 'string'
        ? JSON.parse(aiReport.analysis)
        : aiReport.analysis;
    }
  }

  return NextResponse.json(result);
}
