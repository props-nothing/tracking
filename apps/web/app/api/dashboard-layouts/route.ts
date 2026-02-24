import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const siteId = request.nextUrl.searchParams.get('site_id');
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('site_id', siteId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { site_id, name, widgets } = body;
  if (!site_id || !widgets) {
    return NextResponse.json({ error: 'site_id and widgets required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .upsert(
      {
        site_id,
        user_id: user.id,
        name: name || 'Default',
        widgets,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,user_id,name' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const layoutId = request.nextUrl.searchParams.get('id');
  if (!layoutId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('dashboard_layouts')
    .delete()
    .eq('id', layoutId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
