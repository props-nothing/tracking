import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getDateRange } from '@/lib/query-helpers';

// Helper: verify user has access to site
async function verifySiteAccess(userId: string, siteId: string) {
  const db = await createServiceClient();

  const { data: site } = await db
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (site) return true;

  const { data: membership } = await db
    .from('site_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!membership;
}

// GET /api/campaigns?site_id=xxx&period=last_30_days&provider=google_ads
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const siteId = request.nextUrl.searchParams.get('site_id');
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 });

  if (!(await verifySiteAccess(user.id, siteId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const providerFilter = request.nextUrl.searchParams.get('provider');
  const startParam = request.nextUrl.searchParams.get('start');
  const endParam = request.nextUrl.searchParams.get('end');
  const periodParam = request.nextUrl.searchParams.get('period');
  const customFrom = request.nextUrl.searchParams.get('from');
  const customTo = request.nextUrl.searchParams.get('to');

  // Resolve date range: support both start/end and period/from/to
  let start: string;
  let end: string;

  if (startParam && endParam) {
    start = startParam;
    end = endParam;
  } else if (periodParam) {
    const range = getDateRange(periodParam, customFrom, customTo);
    start = range.fromStr.split('T')[0];
    end = range.toStr.split('T')[0];
  } else {
    // Default to last 30 days
    end = new Date().toISOString().split('T')[0];
    start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  }

  const db = await createServiceClient();

  // 1. Get integrations status
  const { data: integrations } = await db
    .from('campaign_integrations')
    .select('provider, enabled, last_synced_at, last_sync_status, campaign_filter')
    .eq('site_id', siteId);

  // Build a map of campaign_filter per provider
  const filterMap = new Map<string, string | null>();
  for (const i of integrations || []) {
    if (i.campaign_filter) filterMap.set(i.provider, i.campaign_filter);
  }

  // 2. Build campaign data query
  let campaignQuery = db
    .from('campaign_data')
    .select('*')
    .eq('site_id', siteId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (providerFilter) {
    campaignQuery = campaignQuery.eq('provider', providerFilter);
  }

  const { data: campaignData } = await campaignQuery;

  // 3. Apply campaign_filter per provider (case-insensitive name contains)
  const rows = (campaignData || []).filter((row) => {
    const filter = filterMap.get(row.provider);
    if (!filter || filter.trim().length === 0) return true;
    return (row.campaign_name || '').toLowerCase().includes(filter.trim().toLowerCase());
  });
  const totals = {
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversion_value: 0,
    results: 0,
    reach: 0,
    link_clicks: 0,
    ctr: 0,
    avg_cpc: 0,
    cost_per_conversion: 0,
    cost_per_result: 0,
    roas: 0,
    frequency: 0,
    cpm: 0,
  };

  for (const row of rows) {
    totals.impressions += Number(row.impressions) || 0;
    totals.clicks += Number(row.clicks) || 0;
    totals.cost += Number(row.cost) || 0;
    totals.conversions += Number(row.conversions) || 0;
    totals.conversion_value += Number(row.conversion_value) || 0;
    const extras = (row.extra_metrics || {}) as Record<string, unknown>;
    totals.results += Number(extras.results) || 0;
    totals.reach += Number(extras.reach) || 0;
    totals.link_clicks += Number(extras.link_clicks) || 0;
  }

  if (totals.impressions > 0) {
    totals.ctr = Math.round((totals.clicks / totals.impressions) * 10000) / 100;
    totals.cpm = Math.round((totals.cost / totals.impressions * 1000) * 100) / 100;
  }
  if (totals.clicks > 0) {
    totals.avg_cpc = Math.round((totals.cost / totals.clicks) * 100) / 100;
  }
  if (totals.conversions > 0) {
    totals.cost_per_conversion = Math.round((totals.cost / totals.conversions) * 100) / 100;
  }
  if (totals.results > 0) {
    totals.cost_per_result = Math.round((totals.cost / totals.results) * 100) / 100;
  }
  if (totals.cost > 0) {
    totals.roas = Math.round((totals.conversion_value / totals.cost) * 100) / 100;
  }
  if (totals.reach > 0) {
    totals.frequency = Math.round((totals.impressions / totals.reach) * 100) / 100;
  }

  // 4. Aggregate by campaign
  const campaignMap = new Map<string, {
    campaign_id: string;
    campaign_name: string;
    campaign_status: string | null;
    provider: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    ctr: number;
    avg_cpc: number;
    currency: string;
    extra_metrics: Record<string, number>;
  }>();

  // Numeric extra_metrics keys to sum across days
  const SUMMABLE_EXTRAS = [
    'results', 'reach', 'link_clicks', 'outbound_clicks', 'unique_clicks',
  ];
  const LAST_VALUE_EXTRAS = [
    'delivery', 'budget', 'daily_budget', 'lifetime_budget', 'end_time', 'objective',
    'frequency', 'cpm', 'cpc', 'ctr', 'cost_per_result', 'cost_per_link_click',
    'link_click_ctr', 'unique_ctr',
    // Mailchimp
    'sends', 'opens', 'unique_opens', 'open_rate', 'unique_clicks', 'click_rate', 'unsubscribes',
  ];

  for (const row of rows) {
    const key = `${row.provider}:${row.campaign_id}`;
    const existing = campaignMap.get(key);
    const extras = (row.extra_metrics || {}) as Record<string, unknown>;

    if (existing) {
      existing.impressions += Number(row.impressions) || 0;
      existing.clicks += Number(row.clicks) || 0;
      existing.cost += Number(row.cost) || 0;
      existing.conversions += Number(row.conversions) || 0;
      existing.conversion_value += Number(row.conversion_value) || 0;
      // Sum summable extra metrics
      for (const k of SUMMABLE_EXTRAS) {
        if (extras[k] !== undefined) {
          existing.extra_metrics[k] = (existing.extra_metrics[k] || 0) + Number(extras[k]);
        }
      }
      // Keep last value for non-summable
      for (const k of LAST_VALUE_EXTRAS) {
        if (extras[k] !== undefined && extras[k] !== null) {
          existing.extra_metrics[k] = extras[k] as number;
        }
      }
    } else {
      const metricsSeed: Record<string, number> = {};
      for (const k of [...SUMMABLE_EXTRAS, ...LAST_VALUE_EXTRAS]) {
        if (extras[k] !== undefined && extras[k] !== null) {
          metricsSeed[k] = extras[k] as number;
        }
      }
      campaignMap.set(key, {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        campaign_status: row.campaign_status,
        provider: row.provider,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        cost: Number(row.cost) || 0,
        conversions: Number(row.conversions) || 0,
        conversion_value: Number(row.conversion_value) || 0,
        ctr: 0,
        avg_cpc: 0,
        currency: row.currency || 'EUR',
        extra_metrics: metricsSeed,
      });
    }
  }

  const campaigns = Array.from(campaignMap.values()).map((c) => {
    if (c.impressions > 0) c.ctr = Math.round((c.clicks / c.impressions) * 10000) / 100;
    if (c.clicks > 0) c.avg_cpc = Math.round((c.cost / c.clicks) * 100) / 100;
    // Recalculate averaged metrics
    const em = c.extra_metrics;
    if (em.results && em.results > 0) em.cost_per_result = Math.round((c.cost / Number(em.results)) * 100) / 100;
    if (c.impressions > 0) em.frequency = Math.round((Number(em.reach) > 0 ? c.impressions / Number(em.reach) : 0) * 100) / 100;
    if (c.impressions > 0) em.cpm = Math.round((c.cost / c.impressions * 1000) * 100) / 100;
    return c;
  }).sort((a, b) => b.cost - a.cost);

  // 5. Aggregate timeseries by date + provider
  const timeseriesMap = new Map<string, {
    date: string;
    provider: string;
    active_campaigns: Set<string>;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
  }>();

  for (const row of rows) {
    const key = `${row.date}:${row.provider}`;
    const existing = timeseriesMap.get(key);
    if (existing) {
      existing.active_campaigns.add(row.campaign_id);
      existing.impressions += Number(row.impressions) || 0;
      existing.clicks += Number(row.clicks) || 0;
      existing.cost += Number(row.cost) || 0;
      existing.conversions += Number(row.conversions) || 0;
      existing.conversion_value += Number(row.conversion_value) || 0;
    } else {
      timeseriesMap.set(key, {
        date: row.date,
        provider: row.provider,
        active_campaigns: new Set([row.campaign_id]),
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        cost: Number(row.cost) || 0,
        conversions: Number(row.conversions) || 0,
        conversion_value: Number(row.conversion_value) || 0,
      });
    }
  }

  const timeseries = Array.from(timeseriesMap.values())
    .map((t) => ({
      date: t.date,
      provider: t.provider,
      active_campaigns: t.active_campaigns.size,
      impressions: t.impressions,
      clicks: t.clicks,
      cost: t.cost,
      conversions: t.conversions,
      conversion_value: t.conversion_value,
      ctr: t.impressions > 0 ? Math.round((t.clicks / t.impressions) * 10000) / 100 : 0,
      avg_cpc: t.clicks > 0 ? Math.round((t.cost / t.clicks) * 100) / 100 : 0,
      cost_per_conversion: t.conversions > 0 ? Math.round((t.cost / t.conversions) * 100) / 100 : 0,
      roas: t.cost > 0 ? Math.round((t.conversion_value / t.cost) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 6. By-provider summary
  const providerMap = new Map<string, typeof totals>();
  for (const row of rows) {
    const existing = providerMap.get(row.provider);
    const extras = (row.extra_metrics || {}) as Record<string, unknown>;
    if (existing) {
      existing.impressions += Number(row.impressions) || 0;
      existing.clicks += Number(row.clicks) || 0;
      existing.cost += Number(row.cost) || 0;
      existing.conversions += Number(row.conversions) || 0;
      existing.conversion_value += Number(row.conversion_value) || 0;
      existing.results += Number(extras.results) || 0;
      existing.reach += Number(extras.reach) || 0;
      existing.link_clicks += Number(extras.link_clicks) || 0;
    } else {
      providerMap.set(row.provider, {
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        cost: Number(row.cost) || 0,
        conversions: Number(row.conversions) || 0,
        conversion_value: Number(row.conversion_value) || 0,
        results: Number(extras.results) || 0,
        reach: Number(extras.reach) || 0,
        link_clicks: Number(extras.link_clicks) || 0,
        ctr: 0,
        avg_cpc: 0,
        cost_per_conversion: 0,
        cost_per_result: 0,
        roas: 0,
        frequency: 0,
        cpm: 0,
      });
    }
  }

  const byProvider = Array.from(providerMap.entries()).map(([provider, data]) => {
    if (data.impressions > 0) data.ctr = Math.round((data.clicks / data.impressions) * 10000) / 100;
    if (data.clicks > 0) data.avg_cpc = Math.round((data.cost / data.clicks) * 100) / 100;
    if (data.conversions > 0) data.cost_per_conversion = Math.round((data.cost / data.conversions) * 100) / 100;
    if (data.results > 0) data.cost_per_result = Math.round((data.cost / data.results) * 100) / 100;
    if (data.cost > 0) data.roas = Math.round((data.conversion_value / data.cost) * 100) / 100;
    if (data.reach > 0) data.frequency = Math.round((data.impressions / data.reach) * 100) / 100;
    if (data.impressions > 0) data.cpm = Math.round((data.cost / data.impressions * 1000) * 100) / 100;
    return { date: start, provider, active_campaigns: 0, ...data };
  });

  return NextResponse.json({
    providers: (integrations || []).map((i) => ({
      provider: i.provider,
      enabled: i.enabled,
      last_synced_at: i.last_synced_at,
      last_sync_status: i.last_sync_status,
    })),
    totals,
    by_provider: byProvider,
    campaigns,
    timeseries,
  });
}
