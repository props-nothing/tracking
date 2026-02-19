import type { SupabaseClient } from '@supabase/supabase-js';

interface VisitorData {
  site_id: string;
  visitor_id: string;
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
  language: string | null;
  screen_width: number | null;
  screen_height: number | null;
  event_type: string;
  revenue: number | null;
  engaged_time_ms: number | null;
  custom_props: Record<string, any>;
  is_new_session: boolean;
}

/**
 * Upsert visitor profile — creates or updates the aggregate visitor record.
 * Tracks first-touch attribution, last-known device info, and totals.
 */
export async function upsertVisitor(
  supabase: SupabaseClient,
  data: VisitorData
): Promise<void> {
  const now = new Date().toISOString();

  // Check if visitor already exists for this site
  const { data: existing } = await supabase
    .from('visitors')
    .select('id, total_sessions, total_pageviews, total_events, total_revenue, total_engaged_time_ms, custom_props')
    .eq('site_id', data.site_id)
    .eq('visitor_id', data.visitor_id)
    .maybeSingle();

  if (!existing) {
    // New visitor
    await supabase.from('visitors').insert({
      site_id: data.site_id,
      visitor_id: data.visitor_id,
      first_seen_at: now,
      last_seen_at: now,
      total_sessions: 1,
      total_pageviews: data.event_type === 'pageview' ? 1 : 0,
      total_events: 1,
      total_revenue: data.revenue || 0,
      total_engaged_time_ms: data.engaged_time_ms || 0,
      first_referrer_hostname: data.referrer_hostname,
      first_utm_source: data.utm_source,
      first_utm_medium: data.utm_medium,
      first_utm_campaign: data.utm_campaign,
      first_entry_path: data.path,
      last_country_code: data.country_code,
      last_city: data.city,
      last_device_type: data.device_type,
      last_browser: data.browser,
      last_os: data.os,
      last_language: data.language,
      last_screen_width: data.screen_width,
      last_screen_height: data.screen_height,
      custom_props: data.custom_props || {},
    });
    return;
  }

  // Update existing visitor
  const update: Record<string, any> = {
    last_seen_at: now,
    total_pageviews: existing.total_pageviews + (data.event_type === 'pageview' ? 1 : 0),
    total_events: existing.total_events + 1,
    total_revenue: (existing.total_revenue || 0) + (data.revenue || 0),
    total_engaged_time_ms: (existing.total_engaged_time_ms || 0) + (data.engaged_time_ms || 0),
    // Update last-known device/location info
    last_country_code: data.country_code,
    last_city: data.city,
    last_device_type: data.device_type,
    last_browser: data.browser,
    last_os: data.os,
    last_language: data.language,
    last_screen_width: data.screen_width,
    last_screen_height: data.screen_height,
  };

  // Increment sessions only for new sessions
  if (data.is_new_session) {
    update.total_sessions = existing.total_sessions + 1;
  }

  // Merge custom props
  if (data.custom_props && Object.keys(data.custom_props).length > 0) {
    update.custom_props = { ...(existing.custom_props || {}), ...data.custom_props };
  }

  await supabase
    .from('visitors')
    .update(update)
    .eq('id', existing.id);
}
