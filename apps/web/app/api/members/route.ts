import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { memberInviteSchema } from '@/lib/validators';

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

  // Verify user is owner or member of this site
  const { data: siteOwner } = await supabase
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .maybeSingle();

  const { data: membership } = await supabase
    .from('site_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (siteOwner?.user_id !== user.id && !membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('site_members')
    .select('*')
    .eq('site_id', siteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ members: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = memberInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  // Look up user by email — note: in real implementation, you'd send an invite email
  // For now, attempt to add them directly if they have an account
  const { data: existingUser } = await supabase.rpc('get_user_by_email', { email: parsed.data.email });

  if (!existingUser) {
    // In production, send invitation email
    return NextResponse.json({
      message: 'Invitation would be sent. User not yet registered.',
    }, { status: 202 });
  }

  const { data, error } = await supabase
    .from('site_members')
    .insert({
      site_id: parsed.data.site_id,
      user_id: existingUser,
      role: parsed.data.role,
      invited_by: user.id,
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

  const memberId = request.nextUrl.searchParams.get('member_id') || request.nextUrl.searchParams.get('id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 });
  }

  // Verify the member belongs to a site owned by the current user
  const { data: member } = await supabase
    .from('site_members')
    .select('site_id')
    .eq('id', memberId)
    .maybeSingle();

  if (member) {
    const { data: site } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', member.site_id)
      .maybeSingle();

    if (site?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from('site_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
