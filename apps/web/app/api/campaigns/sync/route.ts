import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { syncGoogleAds, syncMetaAds, syncMailchimp } from "@/lib/campaign-sync";

// POST /api/campaigns/sync – Trigger a manual sync for a specific integration
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { site_id, provider } = body;

  if (!site_id)
    return NextResponse.json({ error: "site_id required" }, { status: 400 });
  if (!provider)
    return NextResponse.json({ error: "provider required" }, { status: 400 });

  const db = await createServiceClient();

  // Verify access
  const { data: site } = await db
    .from("sites")
    .select("id")
    .eq("id", site_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    const { data: membership } = await db
      .from("site_members")
      .select("role")
      .eq("site_id", site_id)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Get integration
  const { data: integration } = await db
    .from("campaign_integrations")
    .select("*")
    .eq("site_id", site_id)
    .eq("provider", provider)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  if (!integration.enabled) {
    return NextResponse.json(
      { error: "Integration is disabled" },
      { status: 400 },
    );
  }

  // Resolve credentials: merge credential set (base) with direct credentials (overrides)
  let resolvedCredentials = integration.credentials || {};
  if (integration.credential_set_id) {
    const { data: credSet } = await db
      .from("campaign_credential_sets")
      .select("credentials")
      .eq("id", integration.credential_set_id)
      .maybeSingle();

    if (credSet?.credentials) {
      // Credential set is the base, direct credentials override
      resolvedCredentials = {
        ...credSet.credentials,
        ...Object.fromEntries(
          Object.entries(resolvedCredentials).filter(
            ([, v]) => v && String(v).length > 0,
          ),
        ),
      };
    }
  }

  // Create a copy with resolved credentials and filter for the sync function
  const integrationForSync = {
    ...integration,
    credentials: resolvedCredentials,
    campaign_filter: integration.campaign_filter,
    meta_result_actions: integration.meta_result_actions,
  };

  // Mark syncing
  await db
    .from("campaign_integrations")
    .update({
      last_sync_status: "syncing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  try {
    // Sync last 30 days by default
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86400000);

    const syncFns: Record<string, typeof syncGoogleAds> = {
      google_ads: syncGoogleAds,
      meta_ads: syncMetaAds,
      mailchimp: syncMailchimp,
    };

    const syncFn = syncFns[provider as string];

    if (!syncFn) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const rowCount = await syncFn(db, integrationForSync, startDate, endDate);

    // Mark success
    await db
      .from("campaign_integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return NextResponse.json({ success: true, rows_synced: rowCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown sync error";

    await db
      .from("campaign_integrations")
      .update({
        last_sync_status: "error",
        last_sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
