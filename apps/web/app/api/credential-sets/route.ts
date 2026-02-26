import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const VALID_PROVIDERS = ['google_ads', 'meta_ads', 'mailchimp'];

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

// GET /api/credential-sets?provider=meta_ads (optional filter)
// Returns all credential sets for the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = request.nextUrl.searchParams.get('provider');

  const db = await createServiceClient();
  let query = db
    .from('campaign_credential_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (provider && VALID_PROVIDERS.includes(provider)) {
    query = query.eq('provider', provider);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mask credentials in the response
  const masked = (data || []).map((set) => ({
    ...set,
    credentials: maskCredentials(set.credentials),
  }));

  return NextResponse.json({ credential_sets: masked });
}

// POST /api/credential-sets – Create or update a credential set
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, provider, name, credentials } = body;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const db = await createServiceClient();

  if (id) {
    // Update existing set
    const { data: existing } = await db
      .from('campaign_credential_sets')
      .select('id, credentials')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Credential set not found' }, { status: 404 });
    }

    // Merge — only overwrite non-empty fields
    let merged = existing.credentials || {};
    if (credentials && typeof credentials === 'object') {
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string' && value.length > 0) {
          merged[key] = value;
        }
      }
    }

    const { data, error } = await db
      .from('campaign_credential_sets')
      .update({ name: name.trim(), credentials: merged, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ...data, credentials: maskCredentials(data.credentials) });
  }

  // Create new
  const { data, error } = await db
    .from('campaign_credential_sets')
    .insert({
      user_id: user.id,
      provider,
      name: name.trim(),
      credentials: credentials || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, credentials: maskCredentials(data.credentials) });
}

// DELETE /api/credential-sets?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = await createServiceClient();

  // Verify ownership
  const { data: set } = await db
    .from('campaign_credential_sets')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Unlink any integrations using this set
  await db
    .from('campaign_integrations')
    .update({ credential_set_id: null })
    .eq('credential_set_id', id);

  const { error } = await db.from('campaign_credential_sets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
