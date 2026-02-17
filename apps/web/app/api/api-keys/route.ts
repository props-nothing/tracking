import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiKeySchema } from '@/lib/validators';

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'tk_live_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, site_id, name, key_prefix, permissions, last_used_at, expires_at, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const keys = (data || []).map((k: Record<string, unknown>) => ({
    ...k,
    prefix: k.key_prefix,
    scopes: k.permissions || [],
  }));

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = apiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const rawKey = generateApiKey();
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 16);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      site_id: parsed.data.site_id,
      created_by: user.id,
      name: parsed.data.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: parsed.data.scopes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Return the full key only on creation — it can never be retrieved again
  return NextResponse.json({ ...data, key: rawKey }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyId = request.nextUrl.searchParams.get('id');
  if (!keyId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('created_by', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
