import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendReportEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Find reports due for sending
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  const dayOfMonth = now.getDate();

  const { data: reports } = await supabase
    .from('shared_reports')
    .select('*, sites(name, domain)')
    .not('email_recipients', 'is', null)
    .not('email_schedule', 'is', null);

  if (!reports?.length) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  let sent = 0;

  for (const report of reports) {
    // Check if it's time to send
    const shouldSend =
      (report.email_schedule === 'weekly' && dayOfWeek === 1) || // Monday
      (report.email_schedule === 'monthly' && dayOfMonth === 1); // 1st of month

    if (!shouldSend) continue;

    // Skip if already sent recently
    if (report.email_last_sent_at) {
      const lastSent = new Date(report.email_last_sent_at);
      const hoursSinceLastSend = (now.getTime() - lastSent.getTime()) / 3600000;
      if (hoursSinceLastSend < 12) continue;
    }

    const recipients = report.email_recipients || [];
    if (recipients.length === 0) continue;

    // Calculate date range based on schedule
    const days = report.email_schedule === 'weekly' ? 7 : 30;
    const fromDate = new Date(now.getTime() - days * 86400000);

    // Fetch stats
    const { data: events } = await supabase
      .from('events')
      .select('event_type, visitor_hash, session_id, is_bounce, path, engaged_time_ms')
      .eq('site_id', report.site_id)
      .gte('timestamp', fromDate.toISOString())
      .lte('timestamp', now.toISOString());

    const evts = events || [];
    const pageviews = evts.filter((e) => e.event_type === 'pageview').length;
    const visitors = new Set(evts.map((e) => e.visitor_hash)).size;
    const sessions = new Set(evts.map((e) => e.session_id)).size;

    const siteName = (report as any).sites?.name || 'Your Site';
    const html = `
      <h2>${siteName} — ${report.email_schedule === 'weekly' ? 'Weekly' : 'Monthly'} Report</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Page Views</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${pageviews.toLocaleString()}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Unique Visitors</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${visitors.toLocaleString()}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Sessions</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${sessions.toLocaleString()}</td></tr>
      </table>
      <p style="margin-top: 16px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/report/${report.token}" style="color: #6366f1;">View full report →</a>
      </p>
    `;

    await sendReportEmail(recipients, `${siteName} — Analytics Report`, html);

    // Update last sent timestamp
    await supabase
      .from('shared_reports')
      .update({ email_last_sent_at: now.toISOString() })
      .eq('id', report.id);

    sent++;
  }

  return NextResponse.json({ success: true, sent });
}
