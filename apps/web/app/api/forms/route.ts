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

  // Get form stats from materialized view
  const { data: formStats } = await db
    .from('form_stats')
    .select('*')
    .eq('site_id', siteId);

  // Get recent form events for detailed analysis
  const { data: recentForms } = await db
    .from('events')
    .select('form_id, event_type, form_fields, form_last_field, form_time_to_submit_ms, timestamp')
    .eq('site_id', siteId)
    .in('event_type', ['form_submit', 'form_abandon'])
    .order('timestamp', { ascending: false })
    .limit(200);

  // Compute field-level stats
  const fieldStats: Record<string, Record<string, { interactions: number; total_time_ms: number; errors: number }>> = {};

  for (const evt of recentForms || []) {
    if (!evt.form_id || !evt.form_fields) continue;
    if (!fieldStats[evt.form_id]) {
      fieldStats[evt.form_id] = {};
    }
    const fields = Array.isArray(evt.form_fields) ? evt.form_fields : [];
    for (const field of fields) {
      const name = field.name || 'unknown';
      if (!fieldStats[evt.form_id][name]) {
        fieldStats[evt.form_id][name] = { interactions: 0, total_time_ms: 0, errors: 0 };
      }
      fieldStats[evt.form_id][name].interactions++;
      if (field.time_ms) fieldStats[evt.form_id][name].total_time_ms += field.time_ms;
      if (field.had_error) fieldStats[evt.form_id][name].errors++;
    }
  }

  // Abandonment field analysis
  const abandonFields: Record<string, Record<string, number>> = {};
  for (const evt of recentForms || []) {
    if (evt.event_type !== 'form_abandon' || !evt.form_id || !evt.form_last_field) continue;
    if (!abandonFields[evt.form_id]) abandonFields[evt.form_id] = {};
    abandonFields[evt.form_id][evt.form_last_field] = (abandonFields[evt.form_id][evt.form_last_field] || 0) + 1;
  }

  return NextResponse.json({
    forms: formStats || [],
    field_stats: fieldStats,
    abandon_fields: abandonFields,
  });
}
