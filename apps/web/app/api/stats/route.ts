import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { fetchAll, getDateRange, parseFilters, applyDbFilters, countBy } from '@/lib/query-helpers';

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

  // Verify user has access to this site using the SECURITY DEFINER helper
  // (bypasses RLS to check both sites.user_id and site_members in one call)
  const { data: hasAccess } = await supabase.rpc('has_site_access', { p_site_id: siteId });

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use service client for data queries (auth already verified above)
  const db = await createServiceClient();
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');
  const { fromStr, toStr } = getDateRange(period, customFrom, customTo);
  const filters = parseFilters(searchParams);

  // --- Web Vitals metric ---
  if (metric === 'vitals') {
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('path, ttfb_ms, fcp_ms, lcp_ms, cls, inp_ms, fid_ms, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'pageview')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .not('ttfb_ms', 'is', null)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });

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
      const day = e.timestamp.slice(0, 10);
      (tsMap[day] ||= []).push(e.lcp_ms ?? 0);
    }
    const timeseries = Object.entries(tsMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, arr]) => ({ date, lcp_p75: p75(arr.sort((a, b) => a - b)) }));

    return NextResponse.json({ overall, pages, timeseries });
  }

  // --- Outbound links & downloads metric ---
  if (metric === 'outbound_downloads') {
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('event_type, event_data, visitor_hash, path, timestamp')
        .eq('site_id', siteId)
        .in('event_type', ['outbound_click', 'file_download'])
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });

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
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('path, scroll_depth_pct, visitor_hash, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'pageview')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .not('scroll_depth_pct', 'is', null)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });

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
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('event_type, event_data, path, visitor_hash, timestamp')
        .eq('site_id', siteId)
        .in('event_type', ['rage_click', 'dead_click'])
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });

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
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('event_data, path, referrer, referrer_hostname, visitor_hash, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'custom')
        .eq('event_name', '404')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });

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
    const rawEvts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('path, time_on_page_ms, engaged_time_ms, visitor_hash, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'pageview')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });
    const evts = rawEvts.filter(e => e.time_on_page_ms || e.engaged_time_ms);

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
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('event_type, ecommerce_action, order_id, revenue, currency, ecommerce_items, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'ecommerce')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });
    const addToCarts = evts.filter((e) => e.ecommerce_action === 'add_to_cart');
    const checkouts = evts.filter((e) => e.ecommerce_action === 'begin_checkout');

    // Deduplicate purchases by order_id to prevent double-counted revenue
    // (e.g. from payment gateway redirects creating duplicate events)
    const allPurchases = evts.filter((e) => e.ecommerce_action === 'purchase');
    const seenOrderIds = new Set<string>();
    const purchases = allPurchases.filter((e) => {
      if (e.order_id) {
        if (seenOrderIds.has(e.order_id)) return false;
        seenOrderIds.add(e.order_id);
      }
      return true;
    });

    const totalRevenue = purchases.reduce((s, e) => s + (e.revenue || 0), 0);
    const totalOrders = purchases.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Determine predominant currency from events
    const currencyCounts: Record<string, number> = {};
    for (const e of evts) {
      const c = (e.currency || 'EUR').toUpperCase();
      currencyCounts[c] = (currencyCounts[c] || 0) + 1;
    }
    const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'EUR';

    // Top products from ecommerce_items
    const productMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const e of purchases) {
      const items = Array.isArray(e.ecommerce_items) ? e.ecommerce_items : [];
      for (const item of items) {
        const name = item.name || item.id || 'Unknown';
        if (!productMap[name]) productMap[name] = { revenue: 0, quantity: 0 };
        productMap[name].revenue += (item.price || 0) * (item.quantity || 1);
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
      const day = e.timestamp.slice(0, 10);
      revMap[day] = (revMap[day] || 0) + (e.revenue || 0);
    }
    const revenueTimeseries = Object.entries(revMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));

    return NextResponse.json({
      currency,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      avg_order_value: avgOrderValue,
      add_to_cart_count: addToCarts.length,
      checkout_count: checkouts.length,
      purchase_count: purchases.length,
      top_products: topProducts,
      revenue_timeseries: revenueTimeseries,
    });
  }

  // --- Errors metric ---
  if (metric === 'errors') {
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('error_message, error_source, error_line, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'error')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .order('timestamp', { ascending: false })
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });
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
    const evts = await fetchAll((from, to) => {
      let q = db
        .from('events')
        .select('event_name, event_data, visitor_hash, path, timestamp')
        .eq('site_id', siteId)
        .eq('event_type', 'custom')
        .gte('timestamp', fromStr)
        .lte('timestamp', toStr)
        .order('timestamp', { ascending: false })
        .range(from, to);
      q = applyDbFilters(q, filters);
      return q;
    });
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
    const sess = await fetchAll((from, to) =>
      db
        .from('sessions')
        .select('visitor_hash, started_at')
        .eq('site_id', siteId)
        .gte('started_at', fromStr)
        .lte('started_at', toStr)
        .order('started_at', { ascending: true })
        .range(from, to)
    );

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
  const selectFields = 'event_type, event_name, visitor_hash, session_id, path, referrer_hostname, country_code, city, browser, os, device_type, engaged_time_ms, scroll_depth_pct, is_bounce, is_entry, is_exit, utm_source, utm_medium, utm_campaign, time_on_page_ms, timestamp';

  let baseEventsQuery = db
    .from('events')
    .select(selectFields)
    .eq('site_id', siteId)
    .gte('timestamp', fromStr)
    .lte('timestamp', toStr);
  baseEventsQuery = applyDbFilters(baseEventsQuery, filters);

  const events = await fetchAll((from, to) => {
    let q = db
      .from('events')
      .select(selectFields)
      .eq('site_id', siteId)
      .gte('timestamp', fromStr)
      .lte('timestamp', toStr)
      .range(from, to);
    q = applyDbFilters(q, filters);
    return q;
  });

  // Also fetch sessions for reliable exit_path and duration
  const sessions = await fetchAll((from, to) =>
    db
      .from('sessions')
      .select('id, exit_path, duration_ms, is_bounce')
      .eq('site_id', siteId)
      .gte('started_at', fromStr)
      .lte('started_at', toStr)
      .range(from, to)
  );

  if (!events || events.length === 0) {
    return NextResponse.json({
      pageviews: 0, unique_visitors: 0, sessions: 0,
      avg_session_duration: 0, bounce_rate: 0, views_per_session: 0, avg_engaged_time: 0,
      total_leads: 0, conversion_rate: 0, avg_scroll_depth: 0,
      top_page: null, top_page_count: 0, returning_visitor_pct: 0, returning_visitor_count: 0,
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
  // Use sessions table for bounce rate — event-level is_bounce is unreliable
  // because it reflects the session state at insert time (first event always = true)
  const bounces = (sessions || []).filter((s) => s.is_bounce).length;
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
  // Build a set of bounced session IDs from the sessions table for accurate per-page bounce rate
  const bouncedSessionIds = new Set((sessions || []).filter((s) => s.is_bounce).map((s) => s.id));
  const pageGroups: Record<string, { count: number; visitors: Set<string>; times: number[]; bouncedSessions: number; sessions: Set<string> }> = {};
  for (const e of pvEvents) {
    if (!pageGroups[e.path]) pageGroups[e.path] = { count: 0, visitors: new Set(), times: [], bouncedSessions: 0, sessions: new Set() };
    const pg = pageGroups[e.path];
    pg.count++;
    pg.visitors.add(e.visitor_hash);
    if (!pg.sessions.has(e.session_id)) {
      pg.sessions.add(e.session_id);
      if (bouncedSessionIds.has(e.session_id)) pg.bouncedSessions++;
    }
    if (e.time_on_page_ms) pg.times.push(e.time_on_page_ms);
    else if (e.engaged_time_ms) pg.times.push(e.engaged_time_ms);
  }
  const topPages = Object.entries(pageGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([path, pg]) => ({
      path,
      count: pg.count,
      unique_visitors: pg.visitors.size,
      avg_time: pg.times.length > 0 ? Math.round(pg.times.reduce((a, b) => a + b, 0) / pg.times.length) : 0,
      bounce_rate: pg.sessions.size > 0 ? Math.round((pg.bouncedSessions / pg.sessions.size) * 100) : 0,
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

  // Fetch leads for timeseries markers
  const leads = await fetchAll((from, to) =>
    db
      .from('leads')
      .select('created_at')
      .eq('site_id', siteId)
      .gte('created_at', fromStr)
      .lte('created_at', toStr)
      .range(from, to)
  );

  // Time series — use hourly buckets for today/yesterday, daily for everything else
  const isHourly = period === 'today' || period === 'yesterday';

  if (isHourly) {
    const bucketMap: Record<string, { pageviews: number; visitors: Set<string>; leads: number }> = {};
    // Generate all hour slots
    const startHour = new Date(fromStr);
    startHour.setUTCMinutes(0, 0, 0);
    const endHour = new Date(toStr);
    for (let h = new Date(startHour); h <= endHour; h = new Date(h.getTime() + 3600000)) {
      const key = h.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
      bucketMap[key] = { pageviews: 0, visitors: new Set(), leads: 0 };
    }
    for (const e of pvEvents) {
      const key = new Date(e.timestamp).toISOString().slice(0, 13);
      if (!bucketMap[key]) bucketMap[key] = { pageviews: 0, visitors: new Set(), leads: 0 };
      bucketMap[key].pageviews++;
      bucketMap[key].visitors.add(e.visitor_hash);
    }
    for (const l of leads || []) {
      const key = new Date(l.created_at).toISOString().slice(0, 13);
      if (bucketMap[key]) bucketMap[key].leads++;
    }
    var timeseries = Object.entries(bucketMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, pageviews: d.pageviews, visitors: d.visitors.size, leads: d.leads }));
  } else {
    const bucketMap: Record<string, { pageviews: number; visitors: Set<string>; leads: number }> = {};
    // Fill all day slots in range
    const startDay = new Date(fromStr);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(toStr);
    for (let d = new Date(startDay); d <= endDay; d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().slice(0, 10);
      bucketMap[key] = { pageviews: 0, visitors: new Set(), leads: 0 };
    }
    for (const e of pvEvents) {
      const key = e.timestamp.slice(0, 10);
      if (!bucketMap[key]) bucketMap[key] = { pageviews: 0, visitors: new Set(), leads: 0 };
      bucketMap[key].pageviews++;
      bucketMap[key].visitors.add(e.visitor_hash);
    }
    for (const l of leads || []) {
      const key = l.created_at.slice(0, 10);
      if (bucketMap[key]) bucketMap[key].leads++;
    }
    var timeseries = Object.entries(bucketMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({ date, pageviews: d.pageviews, visitors: d.visitors.size, leads: d.leads }));
  }

  const totalLeads = (leads || []).length;
  const conversionRate = uniqueVisitors > 0
    ? Math.round(totalLeads / uniqueVisitors * 1000) / 10
    : 0;

  // Avg scroll depth
  const scrollDepths = events.filter((e) => e.scroll_depth_pct != null).map((e) => e.scroll_depth_pct!);
  const avgScrollDepth = scrollDepths.length > 0
    ? Math.round(scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length)
    : 0;

  // Top country (single value for overview card)
  // -- removed: not actionable in overview --

  // Top referrer (single value for overview card)
  // -- removed: not actionable in overview --

  // Top page (most viewed page)
  const topPageEntry = topPages.length > 0 ? topPages[0] : null;

  // Returning visitors: visitors with more than one session in this period
  const visitorSessions: Record<string, Set<string>> = {};
  for (const e of events) {
    if (!visitorSessions[e.visitor_hash]) visitorSessions[e.visitor_hash] = new Set();
    visitorSessions[e.visitor_hash].add(e.session_id);
  }
  const returningVisitorCount = Object.values(visitorSessions).filter((s) => s.size > 1).length;
  const returningVisitorPct = uniqueVisitors > 0
    ? Math.round(returningVisitorCount / uniqueVisitors * 1000) / 10
    : 0;

  return NextResponse.json({
    pageviews,
    unique_visitors: uniqueVisitors,
    sessions: uniqueSessions,
    avg_session_duration: avgSessionDuration,
    bounce_rate: bounceRate,
    views_per_session: viewsPerSession,
    avg_engaged_time: avgEngagedTime,
    total_leads: totalLeads,
    conversion_rate: conversionRate,
    avg_scroll_depth: avgScrollDepth,
    top_page: topPageEntry ? topPageEntry.path : null,
    top_page_count: topPageEntry ? topPageEntry.count : 0,
    returning_visitor_pct: returningVisitorPct,
    returning_visitor_count: returningVisitorCount,
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
