import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAlertNotification } from '@/lib/email';
import { sendSlackWebhook, sendWebhook } from '@/lib/webhooks';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*, sites(name, domain)')
    .eq('active', true);

  if (!alerts?.length) {
    return NextResponse.json({ success: true, triggered: 0 });
  }

  const now = new Date();
  let triggered = 0;

  for (const alert of alerts) {
    const threshold = alert.threshold as Record<string, unknown>;

    try {
      let shouldTrigger = false;
      let details = '';

      switch (alert.alert_type) {
        case 'traffic_drop':
        case 'traffic_spike': {
          const pct = Number(threshold.pct || 30);
          const period = String(threshold.period || 'day');
          const periodMs = period === 'hour' ? 3600000 : 86400000;

          const { count: currentCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', alert.site_id)
            .gte('timestamp', new Date(now.getTime() - periodMs).toISOString());

          const { count: previousCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', alert.site_id)
            .gte('timestamp', new Date(now.getTime() - 2 * periodMs).toISOString())
            .lt('timestamp', new Date(now.getTime() - periodMs).toISOString());

          const current = currentCount || 0;
          const previous = previousCount || 1;
          const changePct = Math.round(((current - previous) / previous) * 100);

          if (alert.alert_type === 'traffic_drop' && changePct <= -pct) {
            shouldTrigger = true;
            details = `Traffic dropped ${Math.abs(changePct)}% (${previous} → ${current} events)`;
          } else if (alert.alert_type === 'traffic_spike' && changePct >= pct) {
            shouldTrigger = true;
            details = `Traffic spiked ${changePct}% (${previous} → ${current} events)`;
          }
          break;
        }
        case 'goal_not_met': {
          const days = Number(threshold.days || 3);
          const goalId = String(threshold.goal_id || '');
          if (!goalId) break;

          const { count } = await supabase
            .from('goal_conversions')
            .select('*', { count: 'exact', head: true })
            .eq('goal_id', goalId)
            .gte('converted_at', new Date(now.getTime() - days * 86400000).toISOString());

          if ((count || 0) === 0) {
            shouldTrigger = true;
            details = `Goal has had 0 conversions for the past ${days} days`;
          }
          break;
        }
        case 'error_spike': {
          const errorThreshold = Number(threshold.count || 10);
          const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', alert.site_id)
            .eq('event_type', 'error')
            .gte('timestamp', new Date(now.getTime() - 3600000).toISOString());

          if ((count || 0) >= errorThreshold) {
            shouldTrigger = true;
            details = `${count} JS errors in the last hour (threshold: ${errorThreshold})`;
          }
          break;
        }
        case 'uptime': {
          const minutes = Number(threshold.minutes || 10);
          const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', alert.site_id)
            .gte('timestamp', new Date(now.getTime() - minutes * 60000).toISOString());

          if ((count || 0) === 0) {
            shouldTrigger = true;
            details = `No events received for ${minutes} minutes — site may be down`;
          }
          break;
        }
      }

      if (shouldTrigger) {
        // Don't trigger too frequently
        if (alert.last_triggered_at) {
          const hoursSince = (now.getTime() - new Date(alert.last_triggered_at).getTime()) / 3600000;
          if (hoursSince < 1) continue;
        }

        // Send notifications
        const siteName = (alert as any).sites?.name || 'Unknown site';

        if (alert.notify_email?.length) {
          await sendAlertNotification(alert.notify_email, alert.name, alert.alert_type, details);
        }
        if (alert.notify_slack_webhook) {
          await sendSlackWebhook(alert.notify_slack_webhook, `⚠️ Alert "${alert.name}" (${siteName}): ${details}`);
        }
        if (alert.notify_webhook) {
          await sendWebhook(alert.notify_webhook, {
            event: 'alert.triggered',
            data: { alert_id: alert.id, alert_name: alert.name, type: alert.alert_type, details },
            timestamp: now.toISOString(),
          });
        }

        await supabase
          .from('alerts')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', alert.id);

        triggered++;
      }
    } catch (error) {
      console.error(`Alert evaluation failed for ${alert.id}:`, error);
    }
  }

  return NextResponse.json({ success: true, triggered });
}
