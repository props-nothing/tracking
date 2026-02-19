import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

  // Verify user owns or is admin of the site
  const { data: site } = await db
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!site) {
    const { data: membership } = await db
      .from('site_members')
      .select('role')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Get or create default config
  let { data: config } = await db
    .from('ai_configs')
    .select('*')
    .eq('site_id', siteId)
    .maybeSingle();

  if (!config) {
    // Return defaults without creating yet
    config = {
      id: null,
      site_id: siteId,
      enabled: false,
      schedule: 'manual',
      schedule_hour: 8,
      custom_prompt: null,
      included_sections: ['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
      comparison_enabled: true,
      comparison_period: 'previous_period',
      openai_model: 'gpt-5.2-2025-12-11',
      max_tokens: 3000,
    };
  }

  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { site_id, ...updates } = body;

  if (!site_id) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const db = await createServiceClient();

  // Verify admin access
  const { data: site } = await db
    .from('sites')
    .select('id')
    .eq('id', site_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!site) {
    const { data: membership } = await db
      .from('site_members')
      .select('role')
      .eq('site_id', site_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Upsert config
  const { data, error } = await db
    .from('ai_configs')
    .upsert(
      {
        site_id,
        enabled: updates.enabled ?? false,
        schedule: updates.schedule ?? 'manual',
        schedule_hour: updates.schedule_hour ?? 8,
        custom_prompt: updates.custom_prompt || null,
        included_sections: updates.included_sections || ['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
        comparison_enabled: updates.comparison_enabled ?? true,
        comparison_period: updates.comparison_period ?? 'previous_period',
        openai_model: updates.openai_model ?? 'gpt-5.2-2025-12-11',
        max_tokens: updates.max_tokens ?? 3000,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
