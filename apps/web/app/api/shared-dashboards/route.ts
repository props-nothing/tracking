import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET  /api/shared-dashboards              — list all my shared dashboards
// POST /api/shared-dashboards              — create a new shared dashboard
// GET  /api/shared-dashboards?id=<uuid>    — get single shared dashboard with sites

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  const db = await createServiceClient();

  if (id) {
    // Single dashboard with sites
    const { data: dashboard, error } = await db
      .from('shared_dashboards')
      .select('*, shared_dashboard_sites(id, site_id, report_token, display_order, sites(id, name, domain, logo_url, brand_color))')
      .eq('id', id)
      .eq('created_by', user.id)
      .maybeSingle();

    if (error || !dashboard) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  }

  // List all dashboards
  const { data, error } = await db
    .from('shared_dashboards')
    .select('*, shared_dashboard_sites(id, site_id, report_token, display_order)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ dashboards: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, logo_url, brand_color, password, site_ids } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const db = await createServiceClient();

  // Hash password if provided
  let passwordHash: string | null = null;
  if (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    passwordHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Create the dashboard
  const { data: dashboard, error } = await db
    .from('shared_dashboards')
    .insert({
      created_by: user.id,
      title,
      description: description || null,
      logo_url: logo_url || null,
      brand_color: brand_color || null,
      password_hash: passwordHash,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Add sites if provided
  if (site_ids && Array.isArray(site_ids) && site_ids.length > 0) {
    // For each site, ensure a shared report exists and link it
    for (let i = 0; i < site_ids.length; i++) {
      const siteId = site_ids[i];
      const reportToken = await ensureReportForSite(db, siteId, user.id);

      await db.from('shared_dashboard_sites').insert({
        shared_dashboard_id: dashboard.id,
        site_id: siteId,
        report_token: reportToken,
        display_order: i,
      });
    }
  }

  return NextResponse.json(dashboard, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, description, logo_url, brand_color, password, site_ids } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const db = await createServiceClient();

  // Update dashboard metadata
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (logo_url !== undefined) updates.logo_url = logo_url;
  if (brand_color !== undefined) updates.brand_color = brand_color;

  if (password !== undefined) {
    if (password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      updates.password_hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      updates.password_hash = null;
    }
  }

  const { error } = await db
    .from('shared_dashboards')
    .update(updates)
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update sites if provided
  if (site_ids !== undefined && Array.isArray(site_ids)) {
    // Remove all existing links
    await db.from('shared_dashboard_sites').delete().eq('shared_dashboard_id', id);

    // Re-insert
    for (let i = 0; i < site_ids.length; i++) {
      const siteId = site_ids[i];
      const reportToken = await ensureReportForSite(db, siteId, user.id);

      await db.from('shared_dashboard_sites').insert({
        shared_dashboard_id: id,
        site_id: siteId,
        report_token: reportToken,
        display_order: i,
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const db = await createServiceClient();
  const { error } = await db
    .from('shared_dashboards')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Ensure a shared report exists for a site. Returns the report token.
 */
async function ensureReportForSite(
  db: Awaited<ReturnType<typeof createServiceClient>>,
  siteId: string,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await db
    .from('shared_reports')
    .select('token')
    .eq('site_id', siteId)
    .eq('template', 'overview')
    .limit(1)
    .maybeSingle();

  if (existing) return existing.token;

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
