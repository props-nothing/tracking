import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google-ads/callback?code=...&state=...
 *
 * OAuth 2.0 callback handler for Google Ads.
 * Exchanges the authorization code for access + refresh tokens,
 * then stores the refresh_token in a credential set for the user.
 * Redirects back to the dashboard with a success/error message.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!user) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_unauthorized`);
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  // User denied consent or Google returned an error
  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_denied`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_missing_params`);
  }

  // Decode state
  let state: { site_id: string; user_id: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_invalid_state`);
  }

  // Verify the state user matches the authenticated user
  if (state.user_id !== user.id) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_user_mismatch`);
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google-ads/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_server_config`);
  }

  // Exchange authorization code for tokens
  let tokenData: { access_token?: string; refresh_token?: string; error_description?: string; error?: string };
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('Google OAuth token exchange failed:', tokenData);
      return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_token_exchange`);
    }
  } catch (err) {
    console.error('Google OAuth token exchange error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_token_exchange`);
  }

  // Try to fetch the user's Google Ads customer accounts using the access token
  // This lets us show helpful info but is not required for the flow to work
  let googleEmail = '';
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      googleEmail = userInfo.email || '';
    }
  } catch { /* optional — don't fail the flow */ }

  // Store as a credential set for this user
  const db = await createServiceClient();

  const setName = googleEmail
    ? `Google Ads — ${googleEmail}`
    : `Google Ads — ${new Date().toLocaleDateString('nl-NL')}`;

  // Check if there's already a credential set from a previous OAuth for this user+provider
  // to avoid duplicates — update it if so
  const { data: existingSet } = await db
    .from('campaign_credential_sets')
    .select('id, credentials')
    .eq('user_id', user.id)
    .eq('provider', 'google_ads')
    .ilike('name', 'Google Ads — %')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let credentialSetId: string;

  const credentials = {
    refresh_token: tokenData.refresh_token,
    // client_id and client_secret are server-side — not stored per user
  };

  if (existingSet) {
    // Update existing set with new refresh token
    const merged = { ...existingSet.credentials, ...credentials };
    const { data, error: updateError } = await db
      .from('campaign_credential_sets')
      .update({
        name: setName,
        credentials: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSet.id)
      .select('id')
      .single();

    if (updateError || !data) {
      console.error('Failed to update credential set:', updateError);
      return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_save_failed`);
    }
    credentialSetId = data.id;
  } else {
    // Create new credential set
    const { data, error: insertError } = await db
      .from('campaign_credential_sets')
      .insert({
        user_id: user.id,
        provider: 'google_ads',
        name: setName,
        credentials,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      console.error('Failed to create credential set:', insertError);
      return NextResponse.redirect(`${appUrl}/dashboard?error=google_ads_auth_save_failed`);
    }
    credentialSetId = data.id;
  }

  // Redirect back to the campaigns page with success params
  const successParams = new URLSearchParams({
    google_ads_connected: 'true',
    credential_set_id: credentialSetId,
  });

  return NextResponse.redirect(`${appUrl}/dashboard/${state.site_id}/campaigns?${successParams.toString()}`);
}
