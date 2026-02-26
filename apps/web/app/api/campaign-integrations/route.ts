import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Helper: verify user has admin/owner access to site
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
    .in('role', ['owner', 'admin'])
    .maybeSingle();

  return !!membership;
}

const VALID_PROVIDERS = ['google_ads', 'meta_ads', 'mailchimp'];

// GET /api/campaign-integrations?site_id=xxx
// Returns all integrations for a site (credentials masked)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const siteId = request.nextUrl.searchParams.get('site_id');
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 });

  if (!(await verifySiteAccess(user.id, siteId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await createServiceClient();
  const { data: integrations, error } = await db
    .from('campaign_integrations')
    .select('*, credential_set:campaign_credential_sets(id, name, provider)')
    .eq('site_id', siteId)
    .order('provider');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mask sensitive credential values
  const masked = (integrations || []).map((integration) => ({
    ...integration,
    credentials: maskCredentials(integration.credentials),
  }));

  return NextResponse.json({ integrations: masked });
}

// POST /api/campaign-integrations – Create or update an integration
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { site_id, provider, enabled, credentials, sync_frequency } = body;

  if (!site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  if (!(await verifySiteAccess(user.id, site_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await createServiceClient();

  // Check if integration already exists
  const { data: existing } = await db
    .from('campaign_integrations')
    .select('id, credentials')
    .eq('site_id', site_id)
    .eq('provider', provider)
    .maybeSingle();

  // Merge new credentials with existing ones (only overwrite fields that are provided and non-empty)
  let mergedCredentials = existing?.credentials || {};
  if (credentials && typeof credentials === 'object') {
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value.length > 0) {
        mergedCredentials[key] = value;
      }
    }
  }

  // Handle credential_set_id — allows linking to a shared credential set
  const credential_set_id = body.credential_set_id !== undefined ? body.credential_set_id : (existing as Record<string, unknown>)?.credential_set_id || null;

  // Handle campaign_filter — keyword filter for campaign names
  const campaign_filter = body.campaign_filter !== undefined ? (body.campaign_filter || null) : (existing as Record<string, unknown>)?.campaign_filter || null;

  // Upsert by site_id + provider
  const { data, error } = await db
    .from('campaign_integrations')
    .upsert(
      {
        site_id,
        provider,
        enabled: enabled ?? false,
        credentials: mergedCredentials,
        credential_set_id: credential_set_id || null,
        campaign_filter,
        sync_frequency: sync_frequency || 'daily',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,provider' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ...data,
    credentials: maskCredentials(data.credentials),
  });
}

// DELETE /api/campaign-integrations?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = await createServiceClient();

  // Get integration to verify site access
  const { data: integration } = await db
    .from('campaign_integrations')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();

  if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!(await verifySiteAccess(user.id, integration.site_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Also delete associated campaign data
  await db.from('campaign_data').delete().eq('integration_id', id);
  const { error } = await db.from('campaign_integrations').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

function maskCredentials(creds: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(creds || {})) {
    // Pass through non-sensitive metadata arrays (e.g. accessible_customer_ids, accessible_accounts)
    if (Array.isArray(value)) {
      masked[key] = value;
    } else if (typeof value === 'string' && value.length > 4) {
      masked[key] = value.slice(0, 4) + '•'.repeat(Math.min(value.length - 4, 20));
    } else {
      masked[key] = value ? '••••' : '';
    }
  }
  return masked;
}
