import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Public endpoint — returns shared dashboard data by token (no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await createServiceClient();

  // Look up dashboard by token
  const { data: dashboard, error } = await db
    .from('shared_dashboards')
    .select('id, title, description, logo_url, brand_color, password_hash, expires_at, shared_dashboard_sites(site_id, report_token, display_order, sites(id, name, domain, logo_url, brand_color))')
    .eq('token', token)
    .maybeSingle();

  if (error || !dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  }

  // Check expiry
  if (dashboard.expires_at && new Date(dashboard.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Dashboard has expired' }, { status: 410 });
  }

  // Check password
  if (dashboard.password_hash) {
    const password = request.nextUrl.searchParams.get('password');
    if (!password) {
      return NextResponse.json(
        { error: 'Password required', needs_password: true },
        { status: 401 },
      );
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hash !== dashboard.password_hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }
  }

  // Sort sites by display_order and build response
  const sites = (dashboard.shared_dashboard_sites || [])
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((entry: any) => ({
      id: entry.sites?.id,
      name: entry.sites?.name,
      domain: entry.sites?.domain,
      logo_url: entry.sites?.logo_url,
      brand_color: entry.sites?.brand_color,
      report_token: entry.report_token,
    }));

  return NextResponse.json({
    title: dashboard.title,
    description: dashboard.description,
    logo_url: dashboard.logo_url,
    brand_color: dashboard.brand_color,
    sites,
  });
}
