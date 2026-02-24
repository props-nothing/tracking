import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { goalSchema } from '@/lib/validators';
import { getDateRange } from '@/lib/query-helpers';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get('site_id');
  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const period = searchParams.get('period') || 'last_30_days';
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');
  const { fromStr, toStr } = getDateRange(period, customFrom, customTo);

  const db = await createServiceClient();

  // Fetch goals
  const { data: goals, error } = await db
    .from('goals')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fetch period-aware conversion counts
  const { data: conversionCounts } = await db
    .from('goal_conversions')
    .select('goal_id')
    .eq('site_id', siteId)
    .gte('converted_at', fromStr)
    .lte('converted_at', toStr);

  // Count conversions per goal
  const countsByGoal: Record<string, number> = {};
  for (const c of conversionCounts || []) {
    countsByGoal[c.goal_id] = (countsByGoal[c.goal_id] || 0) + 1;
  }

  // Attach counts in the same shape the frontend expects
  const result = (goals || []).map((goal) => ({
    ...goal,
    goal_conversions: [{ count: countsByGoal[goal.id] || 0 }],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = goalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await createServiceClient();
  const { data, error } = await db
    .from('goals')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
