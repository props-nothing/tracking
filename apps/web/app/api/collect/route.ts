import { NextRequest, NextResponse } from 'next/server';
import { collectPayloadSchema } from '@/lib/validators';
import { generateVisitorHash } from '@/lib/hash';
import { parseUserAgent } from '@/lib/ua-parser';
import { isBotUA } from '@/lib/bot-filter';
import { checkRateLimit } from '@/lib/rate-limiter';
import { geolocate } from '@/lib/geo';
import { upsertSession } from '@/lib/session-manager';
import { evaluateGoals } from '@/lib/goals-engine';
import { createServiceClient } from '@/lib/supabase/server';

// CORS headers for the public collect endpoint
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 2. Rate limit by IP
    const { success: allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return new NextResponse(null, { status: 429, headers: corsHeaders });
    }

    // 3. Parse and validate payload
    const body = await request.json();
    const parsed = collectPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }
    const data = parsed.data;

    // 4. Get user-agent
    const userAgent = request.headers.get('user-agent') || '';

    // 5. Filter bots
    if (isBotUA(userAgent)) {
      return new NextResponse(null, { status: 202, headers: corsHeaders });
    }

    // 6. Validate site_id exists and domain matches
    const supabase = await createServiceClient();
    const { data: site } = await supabase
      .from('sites')
      .select('id, domain')
      .eq('id', data.site_id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json(
        { error: 'Invalid site_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional: validate origin matches site domain
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        // Allow localhost in development
        if (originHost !== site.domain && originHost !== 'localhost') {
          return NextResponse.json(
            { error: 'Origin mismatch' },
            { status: 403, headers: corsHeaders }
          );
        }
      } catch { /* ignore invalid origin */ }
    }

    // 7. Parse user-agent
    const ua = parseUserAgent(userAgent);

    // 8. Geo-locate IP (uses Vercel/Cloudflare headers first, then MaxMind)
    const geo = await geolocate(ip, request);

    // 9. Generate visitor hash
    const screenRes = `${data.screen_width || 0}x${data.screen_height || 0}`;
    const visitorHash = generateVisitorHash(
      ip,
      userAgent,
      screenRes,
      data.language || '',
      data.timezone || ''
    );

    // 10. Upsert session and determine entry/exit/bounce
    const sessionResult = await upsertSession({
      session_id: data.session_id,
      site_id: data.site_id,
      visitor_hash: visitorHash,
      path: data.path,
      referrer_hostname: data.referrer_hostname || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      country_code: geo.country_code,
      city: geo.city,
      device_type: ua.device_type,
      browser: ua.browser,
      os: ua.os,
      custom_props: data.custom_props || {},
      revenue: data.revenue || null,
      event_type: data.event_type,
    });

    // 11. Insert event row
    const eventRow = {
      site_id: data.site_id,
      event_type: data.event_type,
      event_name: data.event_name || null,
      event_data: data.event_data || {},
      url: data.url,
      path: data.path,
      hostname: data.hostname,
      page_title: data.page_title || null,
      referrer: data.referrer || null,
      referrer_hostname: data.referrer_hostname || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_term: data.utm_term || null,
      utm_content: data.utm_content || null,
      visitor_hash: visitorHash,
      session_id: data.session_id,
      custom_props: data.custom_props || {},
      browser: ua.browser,
      browser_version: ua.browser_version,
      os: ua.os,
      os_version: ua.os_version,
      device_type: ua.device_type,
      screen_width: data.screen_width || null,
      screen_height: data.screen_height || null,
      viewport_width: data.viewport_width || null,
      viewport_height: data.viewport_height || null,
      language: data.language || null,
      timezone: data.timezone || null,
      connection_type: data.connection_type || null,
      country_code: geo.country_code,
      country_name: geo.country_name,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      ttfb_ms: data.ttfb_ms ?? null,
      fcp_ms: data.fcp_ms ?? null,
      lcp_ms: data.lcp_ms ?? null,
      cls: data.cls ?? null,
      inp_ms: data.inp_ms ?? null,
      fid_ms: data.fid_ms ?? null,
      scroll_depth_pct: data.scroll_depth_pct ?? null,
      time_on_page_ms: data.time_on_page_ms ?? null,
      engaged_time_ms: data.engaged_time_ms ?? null,
      form_id: data.form_id || null,
      form_action: data.form_action || null,
      form_fields: data.form_fields || null,
      form_last_field: data.form_last_field || null,
      form_time_to_submit_ms: data.form_time_to_submit_ms ?? null,
      ecommerce_action: data.ecommerce_action || null,
      order_id: data.order_id || null,
      revenue: data.revenue ?? null,
      currency: data.currency || null,
      ecommerce_items: data.ecommerce_items || null,
      error_message: data.error_message || null,
      error_stack: data.error_stack || null,
      error_source: data.error_source || null,
      error_line: data.error_line ?? null,
      error_col: data.error_col ?? null,
      is_entry: sessionResult.is_entry,
      is_exit: false, // Will be updated by session close
      is_bounce: sessionResult.is_bounce,
    };

    const { data: insertedEvent } = await supabase.from('events').insert(eventRow).select('id').single();

    // 12. Evaluate goals (async, non-blocking)
    if (insertedEvent) {
      evaluateGoals({
        ...eventRow,
        id: insertedEvent.id,
        session_id: data.session_id,
        visitor_hash: visitorHash,
      } as any).catch((err) => console.error('[Collect] Goal evaluation error:', err));
    }

    // 13. Return 202 Accepted
    return new NextResponse(null, { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error('[Collect] Error:', error);
    return new NextResponse(null, { status: 500, headers: corsHeaders });
  }
}
