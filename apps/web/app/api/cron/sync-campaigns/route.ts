import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncGoogleAds, syncMetaAds, syncMailchimp } from '@/lib/campaign-sync';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/sync-campaigns
 *
 * Automated campaign sync cron job.
 * Runs every hour — checks each integration's sync_frequency to decide
 * whether it should be synced now:
 *   - hourly:  every invocation
 *   - daily:   once per day (first run after midnight UTC)
 *   - weekly:  once per week (Monday, first run after midnight UTC)
 *   - manual:  skip (user must trigger manually)
 *
 * SHARED ACCOUNT OPTIMIZATION:
 * When multiple sites share the same credential set (e.g. the same Meta Ad Account),
 * we fetch from the API only ONCE and then copy the data to all linked integrations.
 * This avoids redundant API calls and rate limit issues.
 */

interface IntegrationRow {
  id: string;
  site_id: string;
  provider: string;
  credentials: Record<string, string> | null;
  credential_set_id: string | null;
  campaign_filter: string | null;
  sync_frequency: string;
  last_synced_at: string | null;
  enabled: boolean;
  credential_set: { credentials?: Record<string, string> } | null;
  [key: string]: unknown;
}

/** Check whether an integration is due for syncing based on its frequency */
function shouldSync(integration: IntegrationRow, now: Date): boolean {
  const freq = integration.sync_frequency;

  if (freq === 'hourly') return true;

  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday

  if (freq === 'daily') {
    if (currentHour > 1) return false;
    if (integration.last_synced_at) {
      const hours = (now.getTime() - new Date(integration.last_synced_at).getTime()) / 3_600_000;
      if (hours < 20) return false;
    }
    return true;
  }

  if (freq === 'weekly') {
    if (currentDay !== 1 || currentHour > 1) return false;
    if (integration.last_synced_at) {
      const days = (now.getTime() - new Date(integration.last_synced_at).getTime()) / 86_400_000;
      if (days < 6) return false;
    }
    return true;
  }

  return false; // manual or unknown
}

/** Resolve credentials by merging credential set (base) with direct credentials (overrides) */
function resolveCredentials(integration: IntegrationRow): Record<string, string> {
  let resolved = (integration.credentials || {}) as Record<string, string>;
  const credSet = integration.credential_set as { credentials?: Record<string, string> } | null;
  if (credSet?.credentials) {
    resolved = {
      ...credSet.credentials,
      ...Object.fromEntries(
        Object.entries(resolved).filter(([, v]) => v && String(v).length > 0),
      ),
    };
  }
  return resolved;
}

/** Copy campaign_data rows from one integration to another (different integration_id + site_id).
 *  Applies the target's campaign_filter if set. */
async function copyDataToSibling(
  db: SupabaseClient,
  sourceIntegrationId: string,
  target: { id: string; site_id: string; campaign_filter?: string | null },
  startStr: string,
  endStr: string,
): Promise<number> {
  // Fetch the source rows
  const { data: sourceRows, error: fetchErr } = await db
    .from('campaign_data')
    .select('*')
    .eq('integration_id', sourceIntegrationId)
    .gte('date', startStr)
    .lte('date', endStr);

  if (fetchErr || !sourceRows?.length) return 0;

  // Apply campaign_filter for the target site (case-insensitive contains)
  const filter = target.campaign_filter?.trim();
  const filteredRows = filter
    ? sourceRows.filter((row: Record<string, unknown>) =>
        (String(row.campaign_name || '')).toLowerCase().includes(filter.toLowerCase())
      )
    : sourceRows;

  if (filteredRows.length === 0) return 0;

  // Map to target integration
  const mapped = filteredRows.map((row: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...rest } = row;
    return {
      ...rest,
      integration_id: target.id,
      site_id: target.site_id,
    };
  });

  // Delete existing data for target + period, then insert fresh
  await db
    .from('campaign_data')
    .delete()
    .eq('integration_id', target.id)
    .gte('date', startStr)
    .lte('date', endStr);

  for (let i = 0; i < mapped.length; i += 500) {
    const chunk = mapped.slice(i, i + 500);
    const { error } = await db
      .from('campaign_data')
      .upsert(chunk, { onConflict: 'integration_id,campaign_id,date,ad_group_id', ignoreDuplicates: false });
    if (error) throw new Error(`Copy fout: ${error.message}`);
  }

  return mapped.length;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await createServiceClient();

  // Fetch all enabled, non-manual integrations
  const { data: integrations, error } = await db
    .from('campaign_integrations')
    .select('*, credential_set:campaign_credential_sets(credentials)')
    .eq('enabled', true)
    .neq('sync_frequency', 'manual');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!integrations?.length) {
    return NextResponse.json({ success: true, processed: 0, skipped: 0, apiCalls: 0 });
  }

  const now = new Date();

  const syncFns: Record<string, typeof syncGoogleAds> = {
    google_ads: syncGoogleAds,
    meta_ads: syncMetaAds,
    mailchimp: syncMailchimp,
  };

  let processed = 0;
  let skipped = 0;
  let apiCalls = 0;
  const errors: { integration_id: string; provider: string; error: string }[] = [];

  // ── Group integrations by shared credential set ─────────────
  // Key = "credset:<credential_set_id>:<provider>" for shared accounts
  // Key = "direct:<integration_id>" for standalone / non-shared accounts
  const groups = new Map<string, IntegrationRow[]>();

  for (const integration of integrations as IntegrationRow[]) {
    if (!shouldSync(integration, now)) {
      skipped++;
      continue;
    }

    const syncFn = syncFns[integration.provider];
    if (!syncFn) {
      skipped++;
      continue;
    }

    const key = integration.credential_set_id
      ? `credset:${integration.credential_set_id}:${integration.provider}`
      : `direct:${integration.id}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(integration);
  }

  console.log(`[sync-campaigns] ${groups.size} unique credential groups from ${integrations.length} integrations`);

  // ── Process each group ──────────────────────────────────────
  for (const [groupKey, groupIntegrations] of groups) {
    const primary = groupIntegrations[0]; // First integration gets the actual API call
    const siblings = groupIntegrations.slice(1); // Others get a data copy

    const resolvedCredentials = resolveCredentials(primary);
    const integrationForSync = {
      ...primary,
      credentials: resolvedCredentials,
      campaign_filter: primary.campaign_filter,
    };

    const syncFn = syncFns[primary.provider];

    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86_400_000);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Mark all integrations in group as syncing
    const allIds = groupIntegrations.map((i) => i.id);
    await db
      .from('campaign_integrations')
      .update({ last_sync_status: 'syncing', updated_at: now.toISOString() })
      .in('id', allIds);

    try {
      // ── Sync primary (actual API call) ──────────────────────
      await db
        .from('campaign_data')
        .delete()
        .eq('integration_id', primary.id)
        .gte('date', startStr)
        .lte('date', endStr);

      const rowCount = await syncFn(db, integrationForSync, startDate, endDate);
      apiCalls++;

      await db
        .from('campaign_integrations')
        .update({
          last_synced_at: now.toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
          updated_at: now.toISOString(),
        })
        .eq('id', primary.id);

      processed++;
      console.log(`[sync-campaigns] ${primary.provider} primary (${primary.id}): ${rowCount} rows [${groupKey}]`);

      // ── Copy to siblings (no API call) ──────────────────────
      for (const sibling of siblings) {
        try {
          const copiedRows = await copyDataToSibling(
            db,
            primary.id,
            { id: sibling.id, site_id: sibling.site_id, campaign_filter: sibling.campaign_filter },
            startStr,
            endStr,
          );

          await db
            .from('campaign_integrations')
            .update({
              last_synced_at: now.toISOString(),
              last_sync_status: 'success',
              last_sync_error: null,
              updated_at: now.toISOString(),
            })
            .eq('id', sibling.id);

          processed++;
          console.log(`[sync-campaigns] ${sibling.provider} sibling (${sibling.id}): ${copiedRows} rows copied from ${primary.id}`);
        } catch (sibErr: unknown) {
          const msg = sibErr instanceof Error ? sibErr.message : 'Copy error';
          await db
            .from('campaign_integrations')
            .update({
              last_sync_status: 'error',
              last_sync_error: msg,
              updated_at: now.toISOString(),
            })
            .eq('id', sibling.id);
          errors.push({ integration_id: sibling.id, provider: sibling.provider, error: msg });
          console.error(`[sync-campaigns] sibling copy (${sibling.id}): ${msg}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';

      // Mark all integrations in this group as error
      await db
        .from('campaign_integrations')
        .update({
          last_sync_status: 'error',
          last_sync_error: message,
          updated_at: now.toISOString(),
        })
        .in('id', allIds);

      for (const i of groupIntegrations) {
        errors.push({ integration_id: i.id, provider: i.provider, error: message });
      }
      console.error(`[sync-campaigns] ${primary.provider} group (${groupKey}): ${message}`);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    skipped,
    apiCalls,
    groups: groups.size,
    errors: errors.length > 0 ? errors : undefined,
  });
}
