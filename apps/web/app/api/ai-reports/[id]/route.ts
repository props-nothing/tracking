import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await createServiceClient();

  const { data: report, error } = await db
    .from('ai_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Verify access
  const { data: site } = await db
    .from('sites')
    .select('id')
    .eq('id', report.site_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!site) {
    const { data: membership } = await db
      .from('site_members')
      .select('role')
      .eq('site_id', report.site_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(report);
}
