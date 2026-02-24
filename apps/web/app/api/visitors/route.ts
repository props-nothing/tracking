import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDateRange } from '@/lib/query-helpers';

/**
 * GET /api/visitors — List visitors for a site with pagination and filtering
 *
 * Query params:
 *   site_id (required)
 *   period (default: last_30_days)
 *   from / to (for custom period)
 *   page (default: 0)
 *   page_size (default: 50)
 *   sort (default: last_seen_at) — last_seen_at, first_seen_at, total_sessions, total_pageviews, total_revenue
 *   order (default: desc) — asc, desc
 *   search — filter by visitor_id (partial match)
 *   country — filter by last_country_code
 *   browser — filter by last_browser
 *   os — filter by last_os
 *   device — filter by last_device_type
 *   referrer — filter by first_referrer_hostname / first_utm_source
 *   returning — 'true' to only show visitors with > 1 session
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const period = searchParams.get('period') || 'last_30_days';
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');
  const { fromStr, toStr } = getDateRange(period, customFrom, customTo);

  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '50', 10), 100);
  const sort = searchParams.get('sort') || 'last_seen_at';
  const order = searchParams.get('order') === 'asc' ? true : false;
  const search = searchParams.get('search');
  const country = searchParams.get('country');
  const browser = searchParams.get('browser');
  const os = searchParams.get('os');
  const device = searchParams.get('device');
  const referrer = searchParams.get('referrer');
  const returning = searchParams.get('returning');

  try {
    // Build query
    let query = supabase
      .from('visitors')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .gte('last_seen_at', fromStr)
      .lte('last_seen_at', toStr);

    // Apply filters
    if (search) {
      query = query.ilike('visitor_id', `%${search}%`);
    }
    if (country) query = query.eq('last_country_code', country);
    if (browser) query = query.ilike('last_browser', `%${browser}%`);
    if (os) query = query.ilike('last_os', `%${os}%`);
    if (device) query = query.eq('last_device_type', device);
    if (referrer) query = query.or(`first_referrer_hostname.ilike.%${referrer}%,first_utm_source.ilike.%${referrer}%`);
    if (returning === 'true') query = query.gt('total_sessions', 1);

    // Sort
    const validSortCols = ['last_seen_at', 'first_seen_at', 'total_sessions', 'total_pageviews', 'total_revenue', 'total_events'];
    const sortCol = validSortCols.includes(sort) ? sort : 'last_seen_at';

    query = query
      .order(sortCol, { ascending: order })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    const { data: visitors, count, error } = await query;

    if (error) {
      console.error('[Visitors API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
    }

    // Also return aggregate stats (period-aware)
    let statsQuery = supabase
      .from('visitors')
      .select('id, total_sessions')
      .eq('site_id', siteId)
      .gte('last_seen_at', fromStr)
      .lte('last_seen_at', toStr);

    if (country) statsQuery = statsQuery.eq('last_country_code', country);
    if (browser) statsQuery = statsQuery.ilike('last_browser', `%${browser}%`);
    if (os) statsQuery = statsQuery.ilike('last_os', `%${os}%`);
    if (device) statsQuery = statsQuery.eq('last_device_type', device);
    if (referrer) statsQuery = statsQuery.or(`first_referrer_hostname.ilike.%${referrer}%,first_utm_source.ilike.%${referrer}%`);

    const { data: statsData } = await statsQuery;

    const totalVisitors = statsData?.length || 0;
    const returningVisitors = statsData?.filter((v) => v.total_sessions > 1).length || 0;

    return NextResponse.json({
      visitors: visitors || [],
      total: count || 0,
      page,
      page_size: pageSize,
      stats: {
        total_visitors: totalVisitors,
        returning_visitors: returningVisitors,
        new_visitors: totalVisitors - returningVisitors,
      },
    });
  } catch (error) {
    console.error('[Visitors API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
