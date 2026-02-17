import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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

  const db = await createServiceClient();

  // Verify user is owner or member of this site
  const { data: siteOwner } = await db
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .maybeSingle();

  const { data: membership } = await db
    .from('site_members')
    .select('role')
    .eq('site_id', siteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (siteOwner?.user_id !== user.id && !membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await db
    .from('site_members')
    .select('id, site_id, user_id, role, invited_at, accepted_at')
    .eq('site_id', siteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Map DB fields to frontend-expected fields
  const members = (data || []).map((m: Record<string, unknown>) => ({
    ...m,
    email: m.user_id, // user_id is what we have; frontend displays it
    joined_at: m.accepted_at || m.invited_at,
  }));

  return NextResponse.json({ members });
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
  const db = await createServiceClient();
  const { data: existingUser } = await db.rpc('get_user_by_email', { email: parsed.data.email });

  if (!existingUser) {
    return NextResponse.json({
      message: 'Invitation would be sent. User not yet registered.',
    }, { status: 202 });
  }

  const { data, error } = await db
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

  const db = await createServiceClient();

  // Verify the member belongs to a site owned by the current user
  const { data: member } = await db
    .from('site_members')
    .select('site_id')
    .eq('id', memberId)
    .maybeSingle();

  if (member) {
    const { data: site } = await db
      .from('sites')
      .select('user_id')
      .eq('id', member.site_id)
      .maybeSingle();

    if (site?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await db
    .from('site_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
