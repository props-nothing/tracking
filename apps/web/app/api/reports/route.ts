import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sharedReportSchema } from '@/lib/validators';

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
    .from('shared_reports')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const reports = (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    name: r.title || r.name,
    password_protected: !!r.password_hash,
  }));

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sharedReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, name, ...reportData } = parsed.data;

  const insertData: Record<string, unknown> = {
    ...reportData,
    title: name,
    created_by: user.id,
  };

  // Hash password if provided
  if (password) {
    // In production, use bcrypt. For simplicity, store a SHA-256 hash.
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    insertData.password_hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const db = await createServiceClient();
  const dbPost = await createServiceClient();
  const { data, error } = await dbPost
    .from('shared_reports')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
