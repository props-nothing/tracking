import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { evaluateGoals } from '@/lib/goals-engine';

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient();
  const body = await request.json();

  const { event_id, site_id } = body;

  if (!event_id || !site_id) {
    return NextResponse.json({ error: 'event_id and site_id required' }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  await evaluateGoals(event);

  return NextResponse.json({ success: true });
}
