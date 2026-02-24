import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getDateRange } from '@/lib/query-helpers';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get('site_id');
  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const db = await createServiceClient();

  // Query parameters
  const page = parseInt(request.nextUrl.searchParams.get('page') || '0', 10);
  const pageSize = Math.min(parseInt(request.nextUrl.searchParams.get('page_size') || '50', 10), 200);
  const status = request.nextUrl.searchParams.get('status'); // filter by status
  const source = request.nextUrl.searchParams.get('source'); // filter by source
  const search = request.nextUrl.searchParams.get('search'); // search name/email
  const referrer = request.nextUrl.searchParams.get('referrer'); // dashboard referrer filter

  // Period handling — convert period param to date range
  const period = request.nextUrl.searchParams.get('period') || 'last_30_days';
  const customFrom = request.nextUrl.searchParams.get('from');
  const customTo = request.nextUrl.searchParams.get('to');
  const { fromStr, toStr } = getDateRange(period, customFrom, customTo);

  // Build query for leads list
  let query = db
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .gte('created_at', fromStr)
    .lte('created_at', toStr)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (source) {
    if (source === 'direct') {
      query = query.is('utm_source', null).is('referrer_hostname', null);
    } else {
      query = query.or(`utm_source.eq.${source},referrer_hostname.eq.${source}`);
    }
  }

  if (referrer) {
    query = query.or(`referrer_hostname.ilike.%${referrer}%,utm_source.ilike.%${referrer}%`);
  }

  if (search) {
    query = query.or(`lead_name.ilike.%${search}%,lead_email.ilike.%${search}%,lead_company.ilike.%${search}%`);
  }

  const { data: leads, count } = await query;

  // Aggregated stats (period-aware)
  let statsQuery = db
    .from('leads')
    .select('id, status, created_at')
    .eq('site_id', siteId)
    .gte('created_at', fromStr)
    .lte('created_at', toStr);

  if (referrer) {
    statsQuery = statsQuery.or(`referrer_hostname.ilike.%${referrer}%,utm_source.ilike.%${referrer}%`);
  }

  const { data: periodLeads } = await statsQuery;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const stats = {
    total_leads: periodLeads?.length || 0,
    new_leads: periodLeads?.filter((l) => l.status === 'new').length || 0,
    this_week: periodLeads?.filter((l) => new Date(l.created_at) >= weekAgo).length || 0,
    this_month: periodLeads?.filter((l) => new Date(l.created_at) >= monthAgo).length || 0,
  };

  // Source breakdown (period-aware)
  let breakdownQuery = db
    .from('leads')
    .select('utm_source, utm_medium, utm_campaign, referrer_hostname')
    .eq('site_id', siteId)
    .gte('created_at', fromStr)
    .lte('created_at', toStr);

  if (referrer) {
    breakdownQuery = breakdownQuery.or(`referrer_hostname.ilike.%${referrer}%,utm_source.ilike.%${referrer}%`);
  }

  const { data: sourceBreakdown } = await breakdownQuery;

  // Compute source summary
  const sourceCounts: Record<string, number> = {};
  for (const lead of sourceBreakdown || []) {
    const src = lead.utm_source || lead.referrer_hostname || 'direct';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Medium breakdown
  const mediumCounts: Record<string, number> = {};
  for (const lead of sourceBreakdown || []) {
    if (lead.utm_medium) {
      mediumCounts[lead.utm_medium] = (mediumCounts[lead.utm_medium] || 0) + 1;
    }
  }
  const mediums = Object.entries(mediumCounts)
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count);

  // Campaign breakdown
  const campaignCounts: Record<string, number> = {};
  for (const lead of sourceBreakdown || []) {
    if (lead.utm_campaign) {
      campaignCounts[lead.utm_campaign] = (campaignCounts[lead.utm_campaign] || 0) + 1;
    }
  }
  const campaigns = Object.entries(campaignCounts)
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    leads: leads || [],
    total: count || 0,
    page,
    page_size: pageSize,
    stats,
    sources,
    mediums,
    campaigns,
  });
}

/**
 * PATCH — Update lead status/notes
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: 'Lead id required' }, { status: 400 });
  }

  const db = await createServiceClient();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;

  const { data, error } = await db
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE — Remove one or more leads
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body as { ids: number[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Lead ids required' }, { status: 400 });
  }

  const db = await createServiceClient();

  const { error } = await db
    .from('leads')
    .delete()
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
