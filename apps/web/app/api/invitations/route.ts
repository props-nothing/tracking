import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invitationId = request.nextUrl.searchParams.get('member_id') || request.nextUrl.searchParams.get('id');
  if (!invitationId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const db = await createServiceClient();

  // Verify the invitation belongs to a site owned by the current user
  const { data: invitation } = await db
    .from('site_invitations')
    .select('site_id')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitation) {
    const { data: site } = await db
      .from('sites')
      .select('user_id')
      .eq('id', invitation.site_id)
      .maybeSingle();

    if (site?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await db
    .from('site_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
