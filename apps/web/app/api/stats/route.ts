import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function getDateRange(period: string, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();

  // Custom date range
  if (period === 'custom' && customFrom) {
    const from = new Date(customFrom);
    const to = customTo ? new Date(customTo + 'T23:59:59.999Z') : now;
    return { fromStr: from.toISOString(), toStr: to.toISOString() };
  }

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

// Parse filter params from search params
interface QueryFilters {
  page?: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  referrer?: string;
}

function parseFilters(searchParams: URLSearchParams): QueryFilters {
  const f: QueryFilters = {};
  for (const key of ['page', 'country', 'browser', 'os', 'device', 'referrer'] as const) {
    const val = searchParams.get(key);
    if (val) f[key] = val;
  }
  return f;
}

// Apply database-level filters to a Supabase query builder
function applyDbFilters(query: any, filters: QueryFilters): any {
  if (filters.country) query = query.eq('country_code', filters.country);
  if (filters.browser) query = query.ilike('browser', `%${filters.browser}%`);
  if (filters.os) query = query.ilike('os', `%${filters.os}%`);
  if (filters.device) query = query.eq('device_type', filters.device);
  if (filters.referrer) query = query.ilike('referrer_hostname', `%${filters.referrer}%`);
  if (filters.page) {
    // Support wildcard: /blog/* → ilike '/blog/%'
    const pattern = filters.page.replace(/\*/g, '%');
    query = query.ilike('path', pattern);
  }
  return query;
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
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');
  const { fromStr, toStr } = getDateRange(period, customFrom, customTo);
  const filters = parseFilters(searchParams);

  // --- Web Vitals metric ---
  if (metric === 'vitals') {
    let vitalsQuery = db
      .from('events')
      .select('path, ttfb_ms, fcp_ms, lcp_ms, cls, inp_ms, fid_ms, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'pageview')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .not('ttfb_ms', 'is', null);
    vitalsQuery = applyDbFilters(vitalsQuery, filters);
    const { data: events } = await vitalsQuery;
    const evts = events || [];

    // Overall aggregation
    const vals = (arr: (number | null)[]): number[] => arr.filter((v): v is number => v != null);
    const p50 = (arr: number[]) => { if (!arr.length) return null; arr.sort((a, b) => a - b); return arr[Math.floor(arr.length * 0.5)]; };
    const p75 = (arr: number[]) => { if (!arr.length) return null; arr.sort((a, b) => a - b); return arr[Math.floor(arr.length * 0.75)]; };

    const overall = {
      sample_count: evts.length,
      ttfb: { p50: p50(vals(evts.map(e => e.ttfb_ms))), p75: p75(vals(evts.map(e => e.ttfb_ms))) },
      fcp: { p50: p50(vals(evts.map(e => e.fcp_ms))), p75: p75(vals(evts.map(e => e.fcp_ms))) },
      lcp: { p50: p50(vals(evts.map(e => e.lcp_ms))), p75: p75(vals(evts.map(e => e.lcp_ms))) },
      cls: { p50: p50(vals(evts.map(e => e.cls))), p75: p75(vals(evts.map(e => e.cls))) },
      inp: { p50: p50(vals(evts.map(e => e.inp_ms))), p75: p75(vals(evts.map(e => e.inp_ms))) },
      fid: { p50: p50(vals(evts.map(e => e.fid_ms))), p75: p75(vals(evts.map(e => e.fid_ms))) },
    };

    // Per-page breakdown
    const pageMap: Record<string, typeof evts> = {};
    for (const e of evts) { (pageMap[e.path] ||= []).push(e); }
    const pages = Object.entries(pageMap)
      .map(([path, pe]) => ({
        path,
        sample_count: pe.length,
        lcp_p75: p75(vals(pe.map(e => e.lcp_ms))),
        fcp_p75: p75(vals(pe.map(e => e.fcp_ms))),
        cls_p75: p75(vals(pe.map(e => e.cls))),
        inp_p75: p75(vals(pe.map(e => e.inp_ms))),
        ttfb_p75: p75(vals(pe.map(e => e.ttfb_ms))),
      }))
      .sort((a, b) => b.sample_count - a.sample_count)
      .slice(0, 30);

    // Timeseries (daily LCP p75)
    const tsMap: Record<string, number[]> = {};
    for (const e of evts) {
      const day = e.timestamp.split('T')[0];
      (tsMap[day] ||= []).push(e.lcp_ms ?? 0);
    }
    const timeseries = Object.entries(tsMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, arr]) => ({ date, lcp_p75: p75(arr.sort((a, b) => a - b)) }));

    return NextResponse.json({ overall, pages, timeseries });
  }

  // --- Outbound links & downloads metric ---
  if (metric === 'outbound_downloads') {
    let obQuery = db
      .from('events')
      .select('event_type, event_data, visitor_hash, path, timestamp')
      .eq('site_id', siteId)
      .in('event_type', ['outbound_click', 'file_download'])
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);
    obQuery = applyDbFilters(obQuery, filters);
    const { data: events } = await obQuery;
    const evts = events || [];

    const outbound = evts.filter(e => e.event_type === 'outbound_click');
    const downloads = evts.filter(e => e.event_type === 'file_download');

    // Aggregate outbound by hostname
    const obMap: Record<string, { count: number; visitors: Set<string>; urls: Record<string, number> }> = {};
    for (const e of outbound) {
      const d = e.event_data as any || {};
      const host = d.hostname || 'unknown';
      if (!obMap[host]) obMap[host] = { count: 0, visitors: new Set(), urls: {} };
      obMap[host].count++;
      obMap[host].visitors.add(e.visitor_hash);
      const url = d.url || '';
      obMap[host].urls[url] = (obMap[host].urls[url] || 0) + 1;
    }
    const outboundLinks = Object.entries(obMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([hostname, d]) => ({
        hostname,
        clicks: d.count,
        unique_visitors: d.visitors.size,
        top_url: Object.entries(d.urls).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      }));

    // Aggregate downloads by filename
    const dlMap: Record<string, { count: number; visitors: Set<string>; extension: string }> = {};
    for (const e of downloads) {
      const d = e.event_data as any || {};
      const filename = d.filename || d.url || 'unknown';
      if (!dlMap[filename]) dlMap[filename] = { count: 0, visitors: new Set(), extension: d.extension || '' };
      dlMap[filename].count++;
      dlMap[filename].visitors.add(e.visitor_hash);
    }
    const downloadFiles = Object.entries(dlMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([filename, d]) => ({
        filename,
        downloads: d.count,
        unique_visitors: d.visitors.size,
        extension: d.extension,
      }));

    return NextResponse.json({
      total_outbound: outbound.length,
      total_downloads: downloads.length,
      outbound_links: outboundLinks,
      download_files: downloadFiles,
    });
  }

  // --- Scroll depth metric ---
  if (metric === 'scroll_depth') {
    let scrollQuery = db
      .from('events')
      .select('path, scroll_depth_pct, visitor_hash, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'pageview')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .not('scroll_depth_pct', 'is', null);
    scrollQuery = applyDbFilters(scrollQuery, filters);
    const { data: events } = await scrollQuery;
    const evts = events || [];

    // Overall
    const depths = evts.map(e => e.scroll_depth_pct!);
    const avgDepth = depths.length > 0 ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : 0;
    const reached25 = depths.filter(d => d >= 25).length;
    const reached50 = depths.filter(d => d >= 50).length;
    const reached75 = depths.filter(d => d >= 75).length;
    const reached100 = depths.filter(d => d >= 100).length;
    const total = depths.length || 1;

    // Per-page breakdown
    const pageMap: Record<string, number[]> = {};
    for (const e of evts) { (pageMap[e.path] ||= []).push(e.scroll_depth_pct!); }
    const pages = Object.entries(pageMap)
      .map(([path, arr]) => ({
        path,
        sample_count: arr.length,
        avg_depth: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        pct_reached_50: Math.round((arr.filter(d => d >= 50).length / arr.length) * 100),
        pct_reached_100: Math.round((arr.filter(d => d >= 100).length / arr.length) * 100),
      }))
      .sort((a, b) => a.avg_depth - b.avg_depth)
      .slice(0, 30);

    return NextResponse.json({
      avg_depth: avgDepth,
      sample_count: depths.length,
      funnel: {
        reached_25: Math.round((reached25 / total) * 100),
        reached_50: Math.round((reached50 / total) * 100),
        reached_75: Math.round((reached75 / total) * 100),
        reached_100: Math.round((reached100 / total) * 100),
      },
      pages,
    });
  }

  // --- UX issues (rage clicks + dead clicks) metric ---
  if (metric === 'ux_issues') {
    let uxQuery = db
      .from('events')
      .select('event_type, event_data, path, visitor_hash, timestamp')
      .eq('site_id', siteId)
      .in('event_type', ['rage_click', 'dead_click'])
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);
    uxQuery = applyDbFilters(uxQuery, filters);
    const { data: events } = await uxQuery;
    const evts = events || [];

    const rageClicks = evts.filter(e => e.event_type === 'rage_click');
    const deadClicks = evts.filter(e => e.event_type === 'dead_click');

    function aggregateClicks(clicks: typeof evts) {
      const map: Record<string, { count: number; visitors: Set<string>; element_tag: string; element_text: string; pages: Set<string> }> = {};
      for (const e of clicks) {
        const d = e.event_data as any || {};
        const key = `${d.element_tag || ''}|${d.element_id || ''}|${d.element_class || ''}`;
        if (!map[key]) map[key] = { count: 0, visitors: new Set(), element_tag: d.element_tag || '', element_text: (d.element_text || '').slice(0, 100), pages: new Set() };
        map[key].count++;
        map[key].visitors.add(e.visitor_hash);
        map[key].pages.add(e.path);
      }
      return Object.values(map)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map(d => ({
          element_tag: d.element_tag,
          element_text: d.element_text,
          count: d.count,
          unique_visitors: d.visitors.size,
          pages: [...d.pages].slice(0, 3),
        }));
    }

    // Pages with most UX issues
    const pageIssues: Record<string, { rage: number; dead: number }> = {};
    for (const e of evts) {
      if (!pageIssues[e.path]) pageIssues[e.path] = { rage: 0, dead: 0 };
      if (e.event_type === 'rage_click') pageIssues[e.path].rage++;
      else pageIssues[e.path].dead++;
    }
    const issuePages = Object.entries(pageIssues)
      .sort((a, b) => (b[1].rage + b[1].dead) - (a[1].rage + a[1].dead))
      .slice(0, 20)
      .map(([path, d]) => ({ path, rage_clicks: d.rage, dead_clicks: d.dead, total: d.rage + d.dead }));

    return NextResponse.json({
      total_rage_clicks: rageClicks.length,
      total_dead_clicks: deadClicks.length,
      rage_click_elements: aggregateClicks(rageClicks),
      dead_click_elements: aggregateClicks(deadClicks),
      issue_pages: issuePages,
    });
  }

  // --- 404 pages metric ---
  if (metric === '404s') {
    let query404 = db
      .from('events')
      .select('event_data, path, referrer, referrer_hostname, visitor_hash, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'custom')
      .eq('event_name', '404')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);
    query404 = applyDbFilters(query404, filters);
    const { data: events } = await query404;
    const evts = events || [];

    // Aggregate by path
    const pathMap: Record<string, { count: number; visitors: Set<string>; referrers: Set<string>; last_seen: string }> = {};
    for (const e of evts) {
      const p = (e.event_data as any)?.path || e.path;
      if (!pathMap[p]) pathMap[p] = { count: 0, visitors: new Set(), referrers: new Set(), last_seen: e.timestamp };
      pathMap[p].count++;
      pathMap[p].visitors.add(e.visitor_hash);
      if (e.referrer_hostname) pathMap[p].referrers.add(e.referrer_hostname);
      if (e.timestamp > pathMap[p].last_seen) pathMap[p].last_seen = e.timestamp;
    }
    const pages = Object.entries(pathMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([path, d]) => ({
        path,
        hits: d.count,
        unique_visitors: d.visitors.size,
        referrers: [...d.referrers].slice(0, 5),
        last_seen: d.last_seen,
      }));

    return NextResponse.json({
      total_404s: evts.length,
      unique_404_pages: Object.keys(pathMap).length,
      pages,
    });
  }

  // --- Time on page metric ---
  if (metric === 'time_on_page') {
    let topQuery = db
      .from('events')
      .select('path, time_on_page_ms, engaged_time_ms, visitor_hash, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'pageview')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);
    topQuery = applyDbFilters(topQuery, filters);
    const { data: events } = await topQuery;
    const evts = (events || []).filter(e => e.time_on_page_ms || e.engaged_time_ms);

    // Per-page breakdown
    const pageMap: Record<string, { times: number[]; engaged: number[]; visitors: Set<string> }> = {};
    for (const e of evts) {
      if (!pageMap[e.path]) pageMap[e.path] = { times: [], engaged: [], visitors: new Set() };
      if (e.time_on_page_ms) pageMap[e.path].times.push(e.time_on_page_ms);
      if (e.engaged_time_ms) pageMap[e.path].engaged.push(e.engaged_time_ms);
      pageMap[e.path].visitors.add(e.visitor_hash);
    }

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const pages = Object.entries(pageMap)
      .map(([path, d]) => ({
        path,
        sample_count: d.times.length || d.engaged.length,
        avg_time_on_page: avg(d.times),
        avg_engaged_time: avg(d.engaged),
        unique_visitors: d.visitors.size,
      }))
      .sort((a, b) => b.avg_time_on_page - a.avg_time_on_page)
      .slice(0, 30);

    // Overall averages
    const allTimes = evts.map(e => e.time_on_page_ms).filter((v): v is number => v != null);
    const allEngaged = evts.map(e => e.engaged_time_ms).filter((v): v is number => v != null);

    return NextResponse.json({
      avg_time_on_page: avg(allTimes),
      avg_engaged_time: avg(allEngaged),
      sample_count: evts.length,
      pages,
    });
  }

  // --- Ecommerce metric ---
  if (metric === 'ecommerce') {
    let ecomQuery = db
      .from('events')
      .select('event_type, ecommerce_action, order_id, revenue, ecommerce_items, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'ecommerce')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr);
    ecomQuery = applyDbFilters(ecomQuery, filters);
    const { data: events } = await ecomQuery;

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
    let errQuery = db
      .from('events')
      .select('error_message, error_source, error_line, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'error')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .order('timestamp', { ascending: false });
    errQuery = applyDbFilters(errQuery, filters);
    const { data: events } = await errQuery;

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
    let evtQuery = db
      .from('events')
      .select('event_name, event_data, visitor_hash, path, timestamp')
      .eq('site_id', siteId)
      .eq('event_type', 'custom')
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .order('timestamp', { ascending: false });
    evtQuery = applyDbFilters(evtQuery, filters);
    const { data: events } = await evtQuery;

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

  let eventsQuery = db
    .from('events')
    .select(selectFields)
    .eq('site_id', siteId)
    .gte('timestamp', fromStr)
    .lte('timestamp', toStr);
  eventsQuery = applyDbFilters(eventsQuery, filters);
  const { data: events } = await eventsQuery;

  // Also fetch sessions for reliable exit_path and duration
  const { data: sessions } = await db
    .from('sessions')
    .select('id, exit_path, duration_ms, is_bounce')
    .eq('site_id', siteId)
    .gte('started_at', fromStr)
    .lte('started_at', toStr);

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

  // Avg session duration from sessions table (more reliable than event-level timing)
  const sessionDurations = (sessions || []).filter((s) => s.duration_ms > 0).map((s) => s.duration_ms);
  const avgSessionDuration = sessionDurations.length > 0
    ? Math.round(sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length)
    : avgEngagedTime;

  // Top pages (enriched with unique_visitors, avg_time, bounce_rate)
  const pageGroups: Record<string, { count: number; visitors: Set<string>; times: number[]; bounces: number; sessions: Set<string> }> = {};
  for (const e of pvEvents) {
    if (!pageGroups[e.path]) pageGroups[e.path] = { count: 0, visitors: new Set(), times: [], bounces: 0, sessions: new Set() };
    const pg = pageGroups[e.path];
    pg.count++;
    pg.visitors.add(e.visitor_hash);
    pg.sessions.add(e.session_id);
    if (e.time_on_page_ms) pg.times.push(e.time_on_page_ms);
    else if (e.engaged_time_ms) pg.times.push(e.engaged_time_ms);
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

  // Exit pages from sessions table (is_exit on events is unreliable)
  const exitPages = countBy(
    (sessions || []).filter((s) => s.exit_path),
    (s) => s.exit_path
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
    avg_session_duration: avgSessionDuration,
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
