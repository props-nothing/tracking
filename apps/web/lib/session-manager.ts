import { createServiceClient } from '@/lib/supabase/server';

interface SessionData {
  session_id: string;
  site_id: string;
  visitor_hash: string;
  path: string;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  custom_props: Record<string, any>;
  revenue: number | null;
  event_type: string;
  engaged_time_ms?: number | null;
}

/**
 * Upsert session — creates a new session or updates an existing one.
 * Determines entry/exit, bounces, duration, etc.
 */
export async function upsertSession(data: SessionData): Promise<{
  is_entry: boolean;
  is_bounce: boolean;
}> {
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  // Check if session already exists
  const { data: existing } = await supabase
    .from('sessions')
    .select('id, started_at, pageviews, events_count, entry_path, total_revenue, engaged_time_ms')
    .eq('id', data.session_id)
    .single();

  if (!existing) {
    // New session
    await supabase.from('sessions').insert({
      id: data.session_id,
      site_id: data.site_id,
      visitor_hash: data.visitor_hash,
      started_at: now,
      ended_at: now,
      duration_ms: 0,
      engaged_time_ms: data.engaged_time_ms || 0,
      pageviews: data.event_type === 'pageview' ? 1 : 0,
      events_count: 1,
      is_bounce: true,
      entry_path: data.path,
      exit_path: data.path,
      referrer_hostname: data.referrer_hostname,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      country_code: data.country_code,
      city: data.city,
      device_type: data.device_type,
      browser: data.browser,
      os: data.os,
      total_revenue: data.revenue || 0,
      custom_props: data.custom_props || {},
    });

    return { is_entry: true, is_bounce: true };
  }

  // Update existing session
  const newPageviews = existing.pageviews + (data.event_type === 'pageview' ? 1 : 0);
  const newEventsCount = existing.events_count + 1;
  const durationMs = new Date(now).getTime() - new Date(existing.started_at).getTime();
  const isBounce = newPageviews <= 1;

  await supabase
    .from('sessions')
    .update({
      ended_at: now,
      duration_ms: durationMs,
      engaged_time_ms: (existing.engaged_time_ms || 0) + (data.engaged_time_ms || 0),
      pageviews: newPageviews,
      events_count: newEventsCount,
      is_bounce: isBounce,
      exit_path: data.path,
      total_revenue: (existing.total_revenue || 0) + (data.revenue || 0),
      custom_props: data.custom_props || {},
    })
    .eq('id', data.session_id);

  // Un-mark older events in this session as is_exit
  // (the new event being inserted will be is_exit = true)
  supabase
    .from('events')
    .update({ is_exit: false })
    .eq('session_id', data.session_id)
    .eq('is_exit', true)
    .then(() => { /* fire and forget */ }, () => { /* ignore */ });

  return { is_entry: false, is_bounce: isBounce };
}
