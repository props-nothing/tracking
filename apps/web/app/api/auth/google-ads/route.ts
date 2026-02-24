import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google-ads?site_id=xxx
 *
 * Initiates the Google OAuth 2.0 authorization code flow for Google Ads.
 * Redirects the user to Google's consent screen.
 * After consent, Google redirects back to /api/auth/google-ads/callback.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get('site_id');
  if (!siteId) {
    return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_ADS_CLIENT_ID is not configured on the server.' },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google-ads/callback`;

  // Build state parameter — encodes site_id so we can associate the credentials on callback
  const state = Buffer.from(JSON.stringify({ site_id: siteId, user_id: user.id })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent', // Always show consent to ensure we get a refresh_token
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
