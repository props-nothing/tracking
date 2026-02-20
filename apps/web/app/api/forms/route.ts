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

  // Get form stats from materialized view (may be stale between cron refreshes)
  const { data: formStats } = await db
    .from('form_stats')
    .select('*')
    .eq('site_id', siteId);

  // Get recent form events for detailed analysis (live data)
  const { data: recentForms } = await db
    .from('events')
    .select('form_id, event_type, form_fields, form_last_field, form_time_to_submit_ms, timestamp')
    .eq('site_id', siteId)
    .in('event_type', ['form_submit', 'form_abandon'])
    .order('timestamp', { ascending: false })
    .limit(500);

  // ── Live-computed form stats (supplements materialized view) ──────
  // This ensures recently submitted forms appear immediately, even if
  // the materialized view hasn't been refreshed yet.
  const liveMap = new Map<string, {
    site_id: string;
    form_id: string;
    submissions: number;
    abandonments: number;
    completion_rate_pct: number | null;
    avg_time_to_submit_ms: number | null;
    most_common_abandon_field: string | null;
  }>();

  for (const evt of recentForms || []) {
    if (!evt.form_id) continue;
    if (!liveMap.has(evt.form_id)) {
      liveMap.set(evt.form_id, {
        site_id: siteId,
        form_id: evt.form_id,
        submissions: 0,
        abandonments: 0,
        completion_rate_pct: null,
        avg_time_to_submit_ms: null,
        most_common_abandon_field: null,
      });
    }
    const entry = liveMap.get(evt.form_id)!;
    if (evt.event_type === 'form_submit') entry.submissions++;
    if (evt.event_type === 'form_abandon') entry.abandonments++;
  }

  // Compute derived stats for live entries
  const submitTimes = new Map<string, number[]>();
  const abandonFieldCounts = new Map<string, Map<string, number>>();
  for (const evt of recentForms || []) {
    if (!evt.form_id) continue;
    if (evt.event_type === 'form_submit' && evt.form_time_to_submit_ms) {
      if (!submitTimes.has(evt.form_id)) submitTimes.set(evt.form_id, []);
      submitTimes.get(evt.form_id)!.push(evt.form_time_to_submit_ms);
    }
    if (evt.event_type === 'form_abandon' && evt.form_last_field) {
      if (!abandonFieldCounts.has(evt.form_id)) abandonFieldCounts.set(evt.form_id, new Map());
      const m = abandonFieldCounts.get(evt.form_id)!;
      m.set(evt.form_last_field, (m.get(evt.form_last_field) || 0) + 1);
    }
  }
  for (const [formId, entry] of liveMap) {
    const total = entry.submissions + entry.abandonments;
    entry.completion_rate_pct = total > 0 ? Math.round(entry.submissions / total * 1000) / 10 : null;
    const times = submitTimes.get(formId);
    entry.avg_time_to_submit_ms = times && times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
    const afc = abandonFieldCounts.get(formId);
    if (afc && afc.size > 0) {
      let maxField = '';
      let maxCount = 0;
      for (const [field, count] of afc) {
        if (count > maxCount) { maxField = field; maxCount = count; }
      }
      entry.most_common_abandon_field = maxField;
    }
  }

  // Merge: use materialized view as base, overlay / add live entries
  const matViewMap = new Map((formStats || []).map(f => [f.form_id, f]));
  for (const [formId, liveEntry] of liveMap) {
    if (!matViewMap.has(formId)) {
      // New form not yet in materialized view — add it
      matViewMap.set(formId, liveEntry);
    } else {
      // Form exists in mat view — use live counts if they are higher
      // (live data is more recent than the stale snapshot)
      const mv = matViewMap.get(formId)!;
      if (liveEntry.submissions > (mv.submissions || 0)) {
        matViewMap.set(formId, { ...mv, ...liveEntry });
      }
    }
  }

  const mergedForms = Array.from(matViewMap.values());

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
    forms: mergedForms,
    field_stats: fieldStats,
    abandon_fields: abandonFields,
  });
}
