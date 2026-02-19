import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/visitors/[visitorId] — Get full visitor profile with session history and events
 *
 * Query params:
 *   site_id (required)
 *   sessions_limit (default: 20) — max sessions to return
 *   events_limit (default: 100) — max events per session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  const { visitorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const sessionsLimit = Math.min(parseInt(searchParams.get('sessions_limit') || '20', 10), 50);
  const eventsLimit = Math.min(parseInt(searchParams.get('events_limit') || '100', 10), 500);

  try {
    // 1. Get visitor profile
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('*')
      .eq('site_id', siteId)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (visitorError) {
      console.error('[Visitor Profile] Error:', visitorError);
      return NextResponse.json({ error: 'Failed to fetch visitor' }, { status: 500 });
    }

    // 2. Get sessions for this visitor (by visitor_id or visitor_hash fallback)
    let sessionsQuery = supabase
      .from('sessions')
      .select('*')
      .eq('site_id', siteId)
      .order('started_at', { ascending: false })
      .limit(sessionsLimit);

    // Try visitor_id first, fall back to matching via events
    sessionsQuery = sessionsQuery.eq('visitor_id', visitorId);

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('[Visitor Profile] Sessions error:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // 3. Get events for all sessions
    const sessionIds = (sessions || []).map(s => s.id);
    let events: any[] = [];

    if (sessionIds.length > 0) {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(
          'id, event_type, event_name, event_data, path, page_title, url, ' +
          'referrer_hostname, utm_source, country_code, city, device_type, browser, os, ' +
          'scroll_depth_pct, time_on_page_ms, engaged_time_ms, ' +
          'form_id, ecommerce_action, order_id, revenue, currency, ' +
          'error_message, is_entry, is_exit, is_bounce, ' +
          'timestamp, session_id'
        )
        .eq('site_id', siteId)
        .in('session_id', sessionIds)
        .order('timestamp', { ascending: false })
        .limit(eventsLimit);

      if (eventsError) {
        console.error('[Visitor Profile] Events error:', eventsError);
      } else {
        events = eventsData || [];
      }
    }

    // 4. Group events by session
    const eventsBySession: Record<string, any[]> = {};
    for (const event of events) {
      const sid = event.session_id;
      if (!eventsBySession[sid]) eventsBySession[sid] = [];
      eventsBySession[sid].push(event);
    }

    // 5. Build session timeline with their events
    const sessionTimeline = (sessions || []).map(session => ({
      ...session,
      events: (eventsBySession[session.id] || []).sort(
        (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    }));

    // 6. Compute visitor summary if no visitors table record exists
    const profile = visitor || {
      visitor_id: visitorId,
      site_id: siteId,
      first_seen_at: sessions?.[sessions.length - 1]?.started_at || null,
      last_seen_at: sessions?.[0]?.started_at || null,
      total_sessions: sessions?.length || 0,
      total_pageviews: events.filter(e => e.event_type === 'pageview').length,
      total_events: events.length,
      total_revenue: sessions?.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0) || 0,
      last_country_code: sessions?.[0]?.country_code || null,
      last_city: sessions?.[0]?.city || null,
      last_device_type: sessions?.[0]?.device_type || null,
      last_browser: sessions?.[0]?.browser || null,
      last_os: sessions?.[0]?.os || null,
    };

    return NextResponse.json({
      visitor: profile,
      sessions: sessionTimeline,
      total_sessions: sessions?.length || 0,
      total_events: events.length,
    });
  } catch (error) {
    console.error('[Visitor Profile] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
