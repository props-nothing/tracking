import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { alertSchema } from '@/lib/validators';

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
    .from('alerts')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = alertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alertId = request.nextUrl.searchParams.get('id');
  if (!alertId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('created_by', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
