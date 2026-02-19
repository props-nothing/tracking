import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  buildDataPayload,
  analyzeData,
  getComparisonDates,
  type AIConfig,
} from '@/lib/ai-engine';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { site_id, period_start, period_end } = body;

  if (!site_id || !period_start || !period_end) {
    return NextResponse.json(
      { error: 'site_id, period_start, and period_end are required' },
      { status: 400 }
    );
  }

  const db = await createServiceClient();

  // Verify access
  const { data: site } = await db
    .from('sites')
    .select('id')
    .eq('id', site_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!site) {
    const { data: membership } = await db
      .from('site_members')
      .select('role')
      .eq('site_id', site_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Rate limit: max 1 analysis per site per hour
  const { data: recent } = await db
    .from('ai_reports')
    .select('generated_at')
    .eq('site_id', site_id)
    .gte('generated_at', new Date(Date.now() - 3600000).toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json(
      { error: 'An analysis was generated less than 1 hour ago. Please wait before generating another.' },
      { status: 429 }
    );
  }

  // Get AI config (or use defaults)
  let { data: config } = await db
    .from('ai_configs')
    .select('*')
    .eq('site_id', site_id)
    .maybeSingle();

  if (!config) {
    config = {
      id: null,
      site_id,
      enabled: true,
      schedule: 'manual',
      schedule_hour: 8,
      custom_prompt: null,
      included_sections: ['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
      comparison_enabled: true,
      comparison_period: 'previous_period',
      openai_model: 'gpt-5.2-2025-12-11',
      max_tokens: 3000,
    };
  }

  try {
    // Build current period data
    const currentData = await buildDataPayload(db, site_id, period_start, period_end);

    // Build comparison data if enabled
    let comparisonData = null;
    let compStart: string | null = null;
    let compEnd: string | null = null;

    if (config.comparison_enabled) {
      const compDates = getComparisonDates(period_start, period_end, config.comparison_period);
      compStart = compDates.start;
      compEnd = compDates.end;
      comparisonData = await buildDataPayload(db, site_id, compStart, compEnd);
    }

    // Get previous AI report summaries for memory
    const { data: previousReports } = await db
      .from('ai_reports')
      .select('analysis')
      .eq('site_id', site_id)
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

    // Estimate cost (approximate for GPT-5.2)
    const costUsd = (result.tokens_used / 1000) * 0.005;

    // Store the report
    const { data: report, error } = await db
      .from('ai_reports')
      .insert({
        site_id,
        period_start,
        period_end,
        comparison_start: compStart,
        comparison_end: compEnd,
        data_snapshot: currentData,
        prompt_used: result.prompt_used,
        analysis: result.analysis,
        model_used: result.model_used,
        tokens_used: result.tokens_used,
        cost_usd: costUsd,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store AI report:', error);
      // Still return result even if storage fails
      return NextResponse.json({
        analysis: result.analysis,
        tokens_used: result.tokens_used,
        model_used: result.model_used,
        stored: false,
      });
    }

    return NextResponse.json({
      id: report.id,
      analysis: result.analysis,
      tokens_used: result.tokens_used,
      model_used: result.model_used,
      period_start,
      period_end,
      comparison_start: compStart,
      comparison_end: compEnd,
      generated_at: report.generated_at,
      stored: true,
    });
  } catch (err: any) {
    console.error('AI analysis error:', err);

    // Try to return the last cached report on failure
    const { data: cached } = await db
      .from('ai_reports')
      .select('*')
      .eq('site_id', site_id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        error: 'AI analysis failed, showing last cached report.',
      });
    }

    return NextResponse.json(
      { error: err.message || 'AI analysis failed' },
      { status: 500 }
    );
  }
}
