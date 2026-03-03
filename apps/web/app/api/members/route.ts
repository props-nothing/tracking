import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { memberInviteSchema } from '@/lib/validators';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Ensure a "member overview" shared report exists for a site.
 * This is the report that viewer/client members see when they open the site.
 */
async function ensureMemberReport(db: Awaited<ReturnType<typeof createServiceClient>>, siteId: string, userId: string) {
  // Check if a member overview report already exists
  const { data: existing } = await db
    .from('shared_reports')
    .select('token')
    .eq('site_id', siteId)
    .eq('template', 'overview')
    .limit(1)
    .maybeSingle();

  if (existing) return existing.token;

  // Create one
  const { data: site } = await db
    .from('sites')
    .select('name, domain')
    .eq('id', siteId)
    .maybeSingle();

  const { data: report } = await db
    .from('shared_reports')
    .insert({
      site_id: siteId,
      created_by: userId,
      title: `${site?.name || site?.domain || 'Site'} — Overzicht`,
      template: 'overview',
      date_range_mode: 'last_30_days',
    })
    .select('token')
    .single();

  return report?.token ?? null;
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

  // Fetch active members and resolve their emails
  const { data: membersData, error } = await db
    .from('site_members')
    .select('id, site_id, user_id, role, invited_at, accepted_at')
    .eq('site_id', siteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Resolve emails for each member via the helper function
  const members = await Promise.all(
    (membersData || []).map(async (m: Record<string, unknown>) => {
      const { data: email } = await db.rpc('get_email_by_user_id', {
        p_user_id: m.user_id,
      });
      return {
        ...m,
        email: email || 'unknown',
        status: 'active' as const,
        joined_at: m.accepted_at || m.invited_at,
      };
    })
  );

  // Also fetch pending invitations
  const { data: invitations } = await db
    .from('site_invitations')
    .select('id, site_id, email, role, invited_at, accepted_at')
    .eq('site_id', siteId)
    .is('accepted_at', null);

  const pendingMembers = (invitations || []).map((inv: Record<string, unknown>) => ({
    ...inv,
    status: 'pending' as const,
    joined_at: inv.invited_at,
  }));

  return NextResponse.json({ members: [...members, ...pendingMembers] });
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

  const db = await createServiceClient();

  // Get site name for the email
  const { data: site } = await db
    .from('sites')
    .select('name, domain')
    .eq('id', parsed.data.site_id)
    .maybeSingle();

  const siteName = site?.name || site?.domain || 'a site';

  // Get inviter email
  const { data: inviterEmail } = await db.rpc('get_email_by_user_id', {
    p_user_id: user.id,
  });

  // Look up user by email
  const { data: existingUserId } = await db.rpc('get_user_by_email', {
    p_email: parsed.data.email,
  });

  if (existingUserId) {
    // User exists — add them directly as a site member
    const { data, error } = await db
      .from('site_members')
      .insert({
        site_id: parsed.data.site_id,
        user_id: existingUserId,
        role: parsed.data.role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ensure a member report exists for this site
    await ensureMemberReport(db, parsed.data.site_id, user.id);

    // Send notification email
    await sendEmail({
      to: parsed.data.email,
      subject: `Je bent toegevoegd aan ${siteName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Je bent toegevoegd aan ${siteName}</h2>
          <p>${inviterEmail || 'Een beheerder'} heeft je toegevoegd als <strong>${parsed.data.role}</strong> aan <strong>${siteName}</strong>.</p>
          <p>
            <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              Ga naar dashboard →
            </a>
          </p>
          <hr style="border-color: #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Verzonden door Tracking Analytics</p>
        </div>
      `,
    });

    return NextResponse.json(data, { status: 201 });
  }

  // User does NOT exist yet — store invitation and send invite email
  const { data: invitation, error: invError } = await db
    .from('site_invitations')
    .insert({
      site_id: parsed.data.site_id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (invError) {
    // Duplicate check
    if (invError.code === '23505') {
      return NextResponse.json({ error: 'Deze gebruiker is al uitgenodigd.' }, { status: 409 });
    }
    return NextResponse.json({ error: invError.message }, { status: 400 });
  }

  // Ensure a member report exists for this site
  await ensureMemberReport(db, parsed.data.site_id, user.id);

  // Send invitation email
  await sendEmail({
    to: parsed.data.email,
    subject: `Uitnodiging voor ${siteName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Je bent uitgenodigd voor ${siteName}</h2>
        <p>${inviterEmail || 'Een beheerder'} heeft je uitgenodigd als <strong>${parsed.data.role}</strong> voor <strong>${siteName}</strong> op Tracking Analytics.</p>
        <p>Maak een account aan om toegang te krijgen:</p>
        <p>
          <a href="${APP_URL}/auth/signup" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
            Account aanmaken →
          </a>
        </p>
        <hr style="border-color: #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Verzonden door Tracking Analytics</p>
      </div>
    `,
  });

  return NextResponse.json({
    ...invitation,
    status: 'pending',
    message: 'Uitnodiging verzonden per e-mail.',
  }, { status: 201 });
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
