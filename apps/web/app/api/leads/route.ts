import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
  const from = request.nextUrl.searchParams.get('from'); // date range start
  const to = request.nextUrl.searchParams.get('to'); // date range end

  // Build query for leads list
  let query = db
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
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

  if (search) {
    query = query.or(`lead_name.ilike.%${search}%,lead_email.ilike.%${search}%,lead_company.ilike.%${search}%`);
  }

  if (from) {
    query = query.gte('created_at', from);
  }
  if (to) {
    query = query.lte('created_at', to);
  }

  const { data: leads, count } = await query;

  // Aggregated stats
  const { data: stats } = await db.rpc('get_lead_stats', { p_site_id: siteId }).single();

  // Source breakdown (from materialized view or live query)
  const { data: sourceBreakdown } = await db
    .from('leads')
    .select('utm_source, utm_medium, utm_campaign, referrer_hostname')
    .eq('site_id', siteId);

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
    stats: stats || { total_leads: 0, new_leads: 0, this_week: 0, this_month: 0 },
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
