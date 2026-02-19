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

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 50);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

  const db = await createServiceClient();

  // Verify access
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
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error, count } = await db
    .from('ai_reports')
    .select('id, site_id, generated_at, period_start, period_end, comparison_start, comparison_end, model_used, tokens_used, cost_usd, analysis', { count: 'exact' })
    .eq('site_id', siteId)
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ reports: data || [], total: count || 0 });
}
