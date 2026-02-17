import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { siteSchema } from '@/lib/validators';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get sites owned by user + sites user is a member of
  const { data: ownedSites } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: memberSites } = await supabase
    .from('site_members')
    .select('site_id, role, sites(*)')
    .eq('user_id', user.id);

  const allSites = [
    ...(ownedSites || []).map((s) => ({ ...s, role: 'owner' as const })),
    ...(memberSites || []).map((m: any) => ({ ...m.sites, role: m.role })),
  ];

  return NextResponse.json(allSites);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = siteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid data', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('sites')
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
