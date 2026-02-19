import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  buildDataPayload,
  analyzeData,
  getComparisonDates,
  type AIConfig,
} from '@/lib/ai-engine';

export async function GET(request: NextRequest) {
  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await createServiceClient();

  // Get all enabled AI configs with daily or weekly schedule
  const { data: configs } = await db
    .from('ai_configs')
    .select('*, sites(name, domain, timezone)')
    .eq('enabled', true)
    .in('schedule', ['daily', 'weekly']);

  if (!configs?.length) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const now = new Date();
  let processed = 0;
  const errors: string[] = [];

  for (const config of configs) {
    try {
      const siteTimezone = (config as any).sites?.timezone || 'UTC';

      // Check if it's the right hour in the site's timezone
      const siteTime = new Date(now.toLocaleString('en-US', { timeZone: siteTimezone }));
      const siteHour = siteTime.getHours();

      if (siteHour !== config.schedule_hour) continue;

      // For weekly, only run on Mondays
      if (config.schedule === 'weekly' && siteTime.getDay() !== 1) continue;

      // Check if we already generated a report today
      const today = now.toISOString().slice(0, 10);
      const { data: existing } = await db
        .from('ai_reports')
        .select('id')
        .eq('site_id', config.site_id)
        .gte('generated_at', `${today}T00:00:00Z`)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      // Build date range: last 30 days for daily, last 7 days for weekly
      const periodEnd = new Date(now.getTime() - 86400000).toISOString().slice(0, 10); // yesterday
      const daysBack = config.schedule === 'weekly' ? 7 : 30;
      const periodStart = new Date(now.getTime() - daysBack * 86400000).toISOString().slice(0, 10);

      // Build data
      const currentData = await buildDataPayload(db, config.site_id, periodStart, periodEnd);

      // Comparison
      let comparisonData = null;
      let compStart: string | null = null;
      let compEnd: string | null = null;

      if (config.comparison_enabled) {
        const compDates = getComparisonDates(periodStart, periodEnd, config.comparison_period);
        compStart = compDates.start;
        compEnd = compDates.end;
        comparisonData = await buildDataPayload(db, config.site_id, compStart, compEnd);
      }

      // Get previous summaries for AI memory
      const { data: previousReports } = await db
        .from('ai_reports')
        .select('analysis')
        .eq('site_id', config.site_id)
        .order('generated_at', { ascending: false })
        .limit(5);

      const previousSummaries = (previousReports || [])
        .map(r => {
          try {
            const a = typeof r.analysis === 'string' ? JSON.parse(r.analysis) : r.analysis;
            return a.summary || '';
          } catch {
            return '';
          }
        })
        .filter(Boolean);

      // Run analysis
      const result = await analyzeData(
        config as AIConfig,
        { ...currentData, previous_ai_summaries: previousSummaries },
        comparisonData,
        previousSummaries,
      );

      const costUsd = (result.tokens_used / 1000) * 0.005;

      await db.from('ai_reports').insert({
        site_id: config.site_id,
        period_start: periodStart,
        period_end: periodEnd,
        comparison_start: compStart,
        comparison_end: compEnd,
        data_snapshot: currentData,
        prompt_used: result.prompt_used,
        analysis: result.analysis,
        model_used: result.model_used,
        tokens_used: result.tokens_used,
        cost_usd: costUsd,
      });

      processed++;
    } catch (err: any) {
      console.error(`AI cron error for site ${config.site_id}:`, err);
      errors.push(`${config.site_id}: ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, processed, errors: errors.length > 0 ? errors : undefined });
}
