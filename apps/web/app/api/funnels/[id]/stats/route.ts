import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeFunnelStats } from '@/lib/funnel-engine';

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

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const period = searchParams.get('period') || 'last_30_days';

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const now = new Date();
  let fromDate: Date;

  switch (period) {
    case 'last_7_days': fromDate = new Date(now.getTime() - 7 * 86400000); break;
    case 'last_30_days': fromDate = new Date(now.getTime() - 30 * 86400000); break;
    case 'last_90_days': fromDate = new Date(now.getTime() - 90 * 86400000); break;
    default: fromDate = new Date(now.getTime() - 30 * 86400000);
  }

  try {
    const result = await computeFunnelStats(id, siteId, fromDate.toISOString(), now.toISOString());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
