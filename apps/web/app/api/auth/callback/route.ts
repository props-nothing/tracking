import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Auto-accept pending invitations for this user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const db = await createServiceClient();
          const { data: pendingInvites } = await db
            .from('site_invitations')
            .select('id, site_id, role, invited_by')
            .eq('email', user.email.toLowerCase())
            .is('accepted_at', null);

          if (pendingInvites && pendingInvites.length > 0) {
            for (const invite of pendingInvites) {
              // Add as site member
              await db.from('site_members').upsert({
                site_id: invite.site_id,
                user_id: user.id,
                role: invite.role,
                invited_by: invite.invited_by,
                accepted_at: new Date().toISOString(),
              }, { onConflict: 'site_id,user_id' });

              // Mark invitation as accepted
              await db
                .from('site_invitations')
                .update({ accepted_at: new Date().toISOString() })
                .eq('id', invite.id);
            }
          }
        }
      } catch (e) {
        // Don't block login if invitation acceptance fails
        console.error('Failed to auto-accept invitations:', e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
