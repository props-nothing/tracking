/**
 * Campaign Sync Engine
 *
 * Handles fetching campaign data from Google Ads, Meta Ads (Facebook/Instagram),
 * and Mailchimp APIs and storing it in the campaign_data table.
 *
 * Each provider function:
 * 1. Uses the stored credentials from campaign_integrations
 * 2. Fetches campaign performance data for the given date range
 * 3. Upserts rows into campaign_data
 * 4. Returns the number of rows synced
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface Integration {
  id: string;
  site_id: string;
  provider: string;
  credentials: Record<string, string>;
  campaign_filter?: string | null;
}

/** Check if a campaign name matches the integration's keyword filter (case-insensitive contains) */
function matchesCampaignFilter(campaignName: string, filter?: string | null): boolean {
  if (!filter || filter.trim().length === 0) return true;
  return campaignName.toLowerCase().includes(filter.trim().toLowerCase());
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ── Google Ads ─────────────────────────────────────────────────
// Uses Google Ads REST API v23
// Required credentials (from credential set): refresh_token, customer_id
// Optional: login_customer_id (for MCC accounts)
// Required env: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN
export async function syncGoogleAds(
  db: SupabaseClient,
  integration: Integration,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const { refresh_token, customer_id, login_customer_id } = integration.credentials;

  // Use server-side OAuth client credentials (from env) — fallback to user-provided for backward compatibility
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || integration.credentials.client_id;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || integration.credentials.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error('Google Ads OAuth is niet geconfigureerd. Stel GOOGLE_ADS_CLIENT_ID en GOOGLE_ADS_CLIENT_SECRET in als server environment variabelen, of gebruik de "Koppel Google Ads" knop.');
  }

  if (!refresh_token || !customer_id) {
    throw new Error('Ontbrekende Google Ads credentials. Vereist: refresh_token en customer_id. Gebruik de "Koppel Google Ads" knop om je account te verbinden.');
  }

  // Validate customer_id format — must be numeric (optionally with dashes like 123-456-7890)
  const strippedCustomerId = customer_id.replace(/-/g, '');
  if (!/^\d{3,10}\d*$/.test(strippedCustomerId)) {
    throw new Error(`Ongeldig Google Ads Klant-ID: "${customer_id}". Het Klant-ID moet numeriek zijn (bijv. 123-456-7890). Je vindt dit rechtsboven in Google Ads.`);
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN ontbreekt in de server environment variabelen. Voeg deze toe aan je .env.local bestand.');
  }

  // 1. Get access token using server-side client credentials + user's refresh token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    let detail = errBody;
    try {
      const parsed = JSON.parse(errBody);
      detail = parsed.error_description || parsed.error || errBody;
    } catch { /* keep raw */ }
    throw new Error(`Google OAuth fout: ${detail}`);
  }

  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token;

  if (!access_token) {
    throw new Error('Google OAuth: geen access_token ontvangen. Controleer je refresh_token.');
  }

  // 2. Query campaign performance via Google Ads API
  const customerId = customer_id.replace(/-/g, '');

  // Check if login_customer_id is needed — if not set, try to detect if customer_id is an MCC account
  let effectiveLoginCustomerId = login_customer_id?.replace(/-/g, '') || '';

  // First, verify the account is not a manager account (can't query metrics on managers)
  try {
    const checkHeaders: Record<string, string> = {
      Authorization: `Bearer ${access_token}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    };
    if (effectiveLoginCustomerId) {
      checkHeaders['login-customer-id'] = effectiveLoginCustomerId;
    }
    const checkRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: checkHeaders,
        body: JSON.stringify({
          query: 'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1',
        }),
      },
    );
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const isManager = checkData.results?.[0]?.customer?.manager === true;
      if (isManager) {
        throw new Error(
          `Het Klant-ID ${customer_id} is een MCC (manager) account. Je kunt geen campagnedata ophalen voor een manager account. ` +
          `Vul het Klant-ID van een specifiek klantaccount in (te vinden in Google Ads onder het MCC-account). ` +
          `Het MCC Klant-ID (${customer_id}) hoort in het veld "MCC Klant-ID".`,
        );
      }
    }
  } catch (e) {
    // Re-throw if it's our own manager-account error
    if (e instanceof Error && e.message.includes('MCC (manager)')) throw e;
    // Otherwise ignore — the actual query below will catch real API errors
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date DESC
  `;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access_token}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  if (login_customer_id) {
    headers['login-customer-id'] = login_customer_id.replace(/-/g, '');
  }

  const gaqlRes = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    },
  );

  if (!gaqlRes.ok) {
    const errText = await gaqlRes.text();
    let detail = `HTTP ${gaqlRes.status}`;
    try {
      const parsed = JSON.parse(errText);
      const apiError = parsed.error;
      if (apiError) {
        detail = `${apiError.code} ${apiError.status}: ${apiError.message}`;
        if (apiError.details?.[0]?.errors?.[0]?.message) {
          detail += ` — ${apiError.details[0].errors[0].message}`;
        }
      }
    } catch {
      // HTML error page — extract meaningful text
      if (errText.includes('404')) {
        detail = 'API endpoint niet gevonden (404). Controleer of de Google Ads API is ingeschakeld in je Google Cloud Console project en of je developer token geldig is.';
      } else if (errText.includes('403')) {
        detail = 'Toegang geweigerd (403). Controleer je developer token en account permissies.';
      } else {
        detail = `HTTP ${gaqlRes.status}: onverwacht antwoord van Google`;
      }
    }
    throw new Error(`Google Ads API fout: ${detail}`);
  }

  const gaqlData = await gaqlRes.json();
  const results = gaqlData.results || [];

  // 3. Upsert into campaign_data
  const rows = results
    .filter((r: Record<string, Record<string, string | number>>) =>
      matchesCampaignFilter(String(r.campaign?.name || ''), integration.campaign_filter)
    )
    .map((r: Record<string, Record<string, string | number>>) => ({
    site_id: integration.site_id,
    integration_id: integration.id,
    provider: 'google_ads',
    campaign_id: String(r.campaign?.id),
    campaign_name: String(r.campaign?.name || 'Onbekend'),
    campaign_status: String(r.campaign?.status || '').toLowerCase(),
    ad_group_id: '_',
    date: r.segments?.date,
    impressions: Number(r.metrics?.impressions) || 0,
    clicks: Number(r.metrics?.clicks) || 0,
    cost: (Number(r.metrics?.costMicros) || 0) / 1_000_000,
    conversions: Number(r.metrics?.conversions) || 0,
    conversion_value: Number(r.metrics?.conversionsValue) || 0,
    currency: 'EUR',
    extra_metrics: {
      ctr: r.metrics?.ctr,
      avg_cpc: r.metrics?.averageCpc ? Number(r.metrics.averageCpc) / 1_000_000 : null,
      search_impression_share: r.metrics?.searchImpressionShare,
    },
  }));

  if (rows.length > 0) {
    // Batch upsert in chunks of 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await db
        .from('campaign_data')
        .upsert(chunk, { onConflict: 'integration_id,campaign_id,date,ad_group_id', ignoreDuplicates: false });
      if (error) throw new Error(`Database fout: ${error.message}`);
    }
  }

  return rows.length;
}

// ── Meta Ads (Facebook / Instagram) ────────────────────────────
// Uses Meta Marketing API v25.0
// Required credentials: access_token, ad_account_id
export async function syncMetaAds(
  db: SupabaseClient,
  integration: Integration,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const { access_token, ad_account_id } = integration.credentials;

  if (!access_token || !ad_account_id) {
    throw new Error('Ontbrekende Meta Ads credentials. Vereist: access_token, ad_account_id');
  }

  const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
  const API_VERSION = 'v25.0';

  // ── Helper: parse Meta API error body ───────────────────────
  function parseMetaError(body: string): string {
    try {
      const p = JSON.parse(body);
      if (p?.error?.message) {
        let msg = `[${p.error.code}] ${p.error.message}`;
        if (p.error.error_user_msg) msg += ` — ${p.error.error_user_msg}`;
        return msg;
      }
    } catch {}
    return body.slice(0, 400);
  }

  // ── Step 1: Verify token ────────────────────────────────────
  const meRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/me?fields=id,name&access_token=${access_token}`,
  );
  if (!meRes.ok) {
    throw new Error(`Meta access token ongeldig of verlopen: ${parseMetaError(await meRes.text())}`);
  }

  // ── Step 2: Check ads_read permission ───────────────────────
  const permsRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/me/permissions?access_token=${access_token}`,
  );
  if (permsRes.ok) {
    const permsData = await permsRes.json();
    const perms = (permsData.data || []) as { permission: string; status: string }[];
    const adsRead = perms.find((p) => p.permission === 'ads_read');
    if (!adsRead || adsRead.status !== 'granted') {
      const granted = perms.filter((p) => p.status === 'granted').map((p) => p.permission).join(', ');
      throw new Error(
        `Meta token mist de 'ads_read' permissie. Huidige permissies: ${granted || 'geen'}. ` +
        `Genereer een nieuw token in Graph API Explorer met ads_read scope.`,
      );
    }
  }

  // ── Step 3: Verify ad account access ────────────────────────
  const acctRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${accountId}?fields=name,account_status,currency&access_token=${access_token}`,
  );
  if (!acctRes.ok) {
    throw new Error(`Kan Meta Ad Account ${accountId} niet bereiken: ${parseMetaError(await acctRes.text())}`);
  }
  const acctData = await acctRes.json();
  const currency = acctData.currency || 'EUR';

  // ── Step 4: Fetch campaign metadata (budget, status, end time) ─
  const campaignMeta = new Map<string, Record<string, unknown>>();
  const campaignsRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${accountId}/campaigns?fields=id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,objective&limit=500&access_token=${access_token}`,
  );
  if (campaignsRes.ok) {
    const campaignsData = await campaignsRes.json();
    for (const c of (campaignsData.data || []) as Record<string, unknown>[]) {
      campaignMeta.set(String(c.id), c);
    }
  }

  // ── Step 5: Fetch insights with synchronous GET ─────────────
  // Use synchronous GET (like Graph API Explorer does).
  // Split into weekly chunks to avoid timeouts on large date ranges.
  const allInsights: Record<string, unknown>[] = [];
  const chunkDays = 7;
  const chunks: { since: string; until: string }[] = [];

  const current = new Date(startDate);
  while (current < endDate) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());
    chunks.push({ since: formatDate(current), until: formatDate(chunkEnd) });
    current.setDate(current.getDate() + chunkDays);
  }

  // Request all fields matching Facebook Ads Manager columns
  const fields = [
    'campaign_id',
    'campaign_name',
    'impressions',
    'clicks',
    'spend',
    'actions',
    'action_values',
    'cost_per_action_type',
    'reach',
    'frequency',
    'cpm',
    'cpc',
    'ctr',
    'inline_link_clicks',
    'cost_per_inline_link_click',
    'inline_link_click_ctr',
    'unique_clicks',
    'unique_ctr',
    'outbound_clicks',
    'cost_per_outbound_click',
    'social_spend',
    'unique_link_clicks_ctr',
  ].join(',');

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      access_token,
      fields,
      time_range: JSON.stringify({ since: chunk.since, until: chunk.until }),
      time_increment: '1',
      level: 'campaign',
      limit: '500',
    });

    let url: string | null = `https://graph.facebook.com/${API_VERSION}/${accountId}/insights?${params}`;

    while (url) {
      const res = await fetch(url);
      const body = await res.text();

      if (!res.ok) {
        // Retry once for transient errors (code 1, 2, 17)
        try {
          const parsed = JSON.parse(body);
          const code = parsed?.error?.code;
          if ([1, 2, 17].includes(code)) {
            await new Promise((r) => setTimeout(r, 3000));
            const retry = await fetch(url);
            const retryBody = await retry.text();
            if (retry.ok) {
              // Parse retry response below
              const retryData = JSON.parse(retryBody);
              const rows = (retryData.data || []) as Record<string, unknown>[];
              allInsights.push(...rows);
              url = retryData.paging?.next || null;
              continue;
            }
          }
        } catch {}
        throw new Error(`Meta Ads API fout (${res.status}): ${parseMetaError(body)}`);
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error(`Meta Ads API onverwacht antwoord: ${body.slice(0, 300)}`);
      }

      const rows = (data.data || []) as Record<string, unknown>[];
      allInsights.push(...rows);
      url = (data.paging as Record<string, string> | undefined)?.next || null;
    }
  }

  // Apply campaign name filter before upserting
  const filteredInsights = integration.campaign_filter
    ? allInsights.filter((row) =>
        matchesCampaignFilter(String(row.campaign_name || ''), integration.campaign_filter)
      )
    : allInsights;

  return await upsertMetaInsights(db, integration, filteredInsights, currency, campaignMeta);
}

// Helper: parse Meta insights and upsert to DB
async function upsertMetaInsights(
  db: SupabaseClient,
  integration: Integration,
  insights: Record<string, unknown>[],
  currency: string,
  campaignMeta?: Map<string, Record<string, unknown>>,
): Promise<number> {
  // Map Meta campaign objectives to the action types Facebook uses for "Results"
  // IMPORTANT: These are PRIORITY ORDERED — use the FIRST match found.
  // Meta reports the same conversion under multiple action_type names
  // (e.g. "lead" and "offsite_conversion.fb_pixel_lead" are the SAME leads).
  // We must pick ONE to avoid double-counting.
  const OBJECTIVE_RESULT_MAP: Record<string, string[]> = {
    // Lead generation campaigns — "lead" is the modern type, legacy is "offsite_conversion.fb_pixel_lead"
    LEAD_GENERATION: ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead', 'leadgen_grouped', 'onsite_conversion.lead_grouped'],
    OUTCOME_LEADS: ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead', 'leadgen_grouped', 'onsite_conversion.lead_grouped'],
    // Purchase / sales campaigns
    OUTCOME_SALES: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
    CONVERSIONS: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'lead', 'offsite_conversion.fb_pixel_lead'],
    PRODUCT_CATALOG_SALES: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
    // Traffic campaigns
    LINK_CLICKS: ['link_click'],
    OUTCOME_TRAFFIC: ['landing_page_view', 'link_click'],
    // Engagement campaigns
    OUTCOME_ENGAGEMENT: ['post_engagement', 'page_engagement', 'video_view', 'landing_page_view'],
    POST_ENGAGEMENT: ['post_engagement', 'page_engagement'],
    // Awareness campaigns
    OUTCOME_AWARENESS: ['reach'],
    BRAND_AWARENESS: ['reach'],
    REACH: ['reach'],
    // App installs
    OUTCOME_APP_PROMOTION: ['app_install', 'mobile_app_install'],
    APP_INSTALLS: ['app_install', 'mobile_app_install'],
    // Video views
    VIDEO_VIEWS: ['video_view'],
    // Messages
    MESSAGES: ['messaging_conversation_started_7d', 'onsite_conversion.messaging_conversation_started_7d'],
  };

  // Purchase action types (for conversions/conversion_value)
  const PURCHASE_ACTIONS = ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase'];

  const allRows: Record<string, unknown>[] = [];

  for (const row of insights) {
    const actions = (row.actions || []) as { action_type: string; value: string }[];
    const actionValues = (row.action_values || []) as { action_type: string; value: string }[];
    const costPerAction = (row.cost_per_action_type || []) as { action_type: string; value: string }[];

    // Get campaign objective to determine what counts as a "Result"
    const meta = campaignMeta?.get(String(row.campaign_id)) || {};
    const objective = String(meta.objective || '').toUpperCase();

    // Determine the action types that count as "results" for this campaign's objective
    // Use PRIORITY ORDER: pick the FIRST action_type that exists in the actions array
    const resultPriorityList = OBJECTIVE_RESULT_MAP[objective] || [];

    // Find the first action_type from the priority list that exists in this row's actions
    let totalResults = 0;
    let matchedActionType = '';
    if (resultPriorityList.length > 0) {
      for (const actionType of resultPriorityList) {
        const match = actions.find((a) => a.action_type === actionType);
        if (match) {
          totalResults = Number(match.value) || 0;
          matchedActionType = actionType;
          break; // Use ONLY the first match — don't sum duplicates
        }
      }
    } else {
      // Fallback: try lead first, then purchase (single match only)
      const leadMatch = actions.find((a) => a.action_type === 'lead');
      const purchaseMatch = actions.find((a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
      if (leadMatch) {
        totalResults = Number(leadMatch.value) || 0;
        matchedActionType = 'lead';
      } else if (purchaseMatch) {
        totalResults = Number(purchaseMatch.value) || 0;
        matchedActionType = purchaseMatch.action_type;
      }
    }

    // Conversions = purchases specifically
    const conversions = actions
      .filter((a) => PURCHASE_ACTIONS.includes(a.action_type))
      .reduce((s, a) => s + Number(a.value), 0);
    const conversionValue = actionValues
      .filter((a) => PURCHASE_ACTIONS.includes(a.action_type))
      .reduce((s, a) => s + Number(a.value), 0);

    // Cost per result — find the cost_per_action_type entry matching the specific action type we used
    let costPerResult = 0;
    if (matchedActionType) {
      const matchingCost = costPerAction.find((c) => c.action_type === matchedActionType);
      costPerResult = matchingCost ? Number(matchingCost.value) || 0 : 0;
    }
    if (costPerResult === 0 && totalResults > 0) {
      costPerResult = Number(row.spend) / totalResults;
    }

    // Link clicks
    const linkClicks = Number(row.inline_link_clicks) || 0;
    const costPerLinkClick = Number(row.cost_per_inline_link_click) || 0;

    // Outbound clicks
    const outboundClicks = ((row.outbound_clicks || []) as { action_type: string; value: string }[])
      .reduce((s, a) => s + Number(a.value), 0);

    // Campaign metadata (budget, delivery, end date) — `meta` already obtained above for objective
    const dailyBudget = Number(meta.daily_budget) / 100 || 0; // Meta stores in cents
    const lifetimeBudget = Number(meta.lifetime_budget) / 100 || 0;
    const budget = lifetimeBudget || dailyBudget;
    const delivery = (meta.effective_status as string) || 'unknown';
    const endTime = (meta.stop_time as string) || null;

    allRows.push({
      site_id: integration.site_id,
      integration_id: integration.id,
      provider: 'meta_ads',
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name || 'Onbekend',
      campaign_status: delivery,
      ad_group_id: '_',
      date: row.date_start,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      cost: Number(row.spend) || 0,
      conversions,
      conversion_value: conversionValue,
      currency,
      extra_metrics: {
        // Facebook Ads Manager columns
        delivery,
        results: totalResults,
        cost_per_result: Math.round(costPerResult * 100) / 100,
        budget,
        daily_budget: dailyBudget,
        lifetime_budget: lifetimeBudget,
        reach: Number(row.reach) || 0,
        frequency: Number(row.frequency) || 0,
        cpm: Number(row.cpm) || 0,
        cpc: Number(row.cpc) || 0,
        ctr: Number(row.ctr) || 0,
        link_clicks: linkClicks,
        cost_per_link_click: costPerLinkClick,
        link_click_ctr: Number(row.inline_link_click_ctr) || 0,
        unique_clicks: Number(row.unique_clicks) || 0,
        unique_ctr: Number(row.unique_ctr) || 0,
        outbound_clicks: outboundClicks,
        end_time: endTime,
        objective: (meta.objective as string) || null,
        actions: row.actions,
      },
    });
  }

  if (allRows.length > 0) {
    for (let i = 0; i < allRows.length; i += 500) {
      const chunk = allRows.slice(i, i + 500);
      const { error } = await db
        .from('campaign_data')
        .upsert(chunk, { onConflict: 'integration_id,campaign_id,date,ad_group_id', ignoreDuplicates: false });
      if (error) throw new Error(`Database fout: ${error.message}`);
    }
  }

  return allRows.length;
}

// ── Mailchimp ──────────────────────────────────────────────────
// Uses Mailchimp Marketing API v3
// Required credentials: api_key, server_prefix
// Optional: list_id (audience ID to filter)
export async function syncMailchimp(
  db: SupabaseClient,
  integration: Integration,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const { api_key, server_prefix, list_id } = integration.credentials;

  if (!api_key || !server_prefix) {
    throw new Error('Ontbrekende Mailchimp credentials. Vereist: api_key, server_prefix');
  }

  const baseUrl = `https://${server_prefix}.api.mailchimp.com/3.0`;
  const authHeader = `Basic ${btoa(`anystring:${api_key}`)}`;

  // Fetch campaigns (sent emails)
  const params = new URLSearchParams({
    count: '300',
    sort_field: 'send_time',
    sort_dir: 'DESC',
    since_send_time: startDate.toISOString(),
    before_send_time: endDate.toISOString(),
    status: 'sent',
  });

  if (list_id) {
    params.set('list_id', list_id);
  }

  const campaignsRes = await fetch(`${baseUrl}/campaigns?${params}`, {
    headers: { Authorization: authHeader },
  });

  if (!campaignsRes.ok) {
    const err = await campaignsRes.text();
    throw new Error(`Mailchimp API fout: ${err}`);
  }

  const campaignsData = await campaignsRes.json();
  const campaigns = campaignsData.campaigns || [];

  const allRows: Record<string, unknown>[] = [];

  for (const campaign of campaigns) {
    // Apply campaign name filter
    const campaignName = campaign.settings?.subject_line || campaign.settings?.title || 'Onbekend';
    if (!matchesCampaignFilter(campaignName, integration.campaign_filter)) continue;

    // Fetch report for each campaign
    const reportRes = await fetch(`${baseUrl}/reports/${campaign.id}`, {
      headers: { Authorization: authHeader },
    });

    if (!reportRes.ok) continue;

    const report = await reportRes.json();

    const sendDate = campaign.send_time
      ? new Date(campaign.send_time).toISOString().split('T')[0]
      : formatDate(new Date());

    allRows.push({
      site_id: integration.site_id,
      integration_id: integration.id,
      provider: 'mailchimp',
      campaign_id: campaign.id,
      campaign_name: campaign.settings?.subject_line || campaign.settings?.title || 'Onbekend',
      campaign_status: campaign.status,
      ad_group_id: '_',
      date: sendDate,
      impressions: report.opens?.opens_total || 0,
      clicks: report.clicks?.clicks_total || 0,
      cost: 0, // Mailchimp doesn't report cost
      conversions: 0,
      conversion_value: 0,
      currency: 'EUR',
      extra_metrics: {
        sends: report.emails_sent || 0,
        opens: report.opens?.opens_total || 0,
        unique_opens: report.opens?.unique_opens || 0,
        open_rate: report.opens?.open_rate || 0,
        clicks_total: report.clicks?.clicks_total || 0,
        unique_clicks: report.clicks?.unique_clicks || 0,
        click_rate: report.clicks?.click_rate || 0,
        unsubscribes: report.unsubscribed || 0,
        bounces_hard: report.bounces?.hard_bounces || 0,
        bounces_soft: report.bounces?.soft_bounces || 0,
        list_name: report.list_name || null,
        subject_line: campaign.settings?.subject_line || null,
      },
    });
  }

  // Upsert into campaign_data
  if (allRows.length > 0) {
    for (let i = 0; i < allRows.length; i += 500) {
      const chunk = allRows.slice(i, i + 500);
      const { error } = await db
        .from('campaign_data')
        .upsert(chunk, { onConflict: 'integration_id,campaign_id,date,ad_group_id', ignoreDuplicates: false });
      if (error) throw new Error(`Database fout: ${error.message}`);
    }
  }

  return allRows.length;
}
