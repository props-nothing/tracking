import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { compareReports, type AIConfig } from '@/lib/ai-engine';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { site_id, report_id_a, report_id_b } = body;

  if (!site_id || !report_id_a || !report_id_b) {
    return NextResponse.json(
      { error: 'site_id, report_id_a, and report_id_b are required' },
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

  // Fetch both reports
  const { data: reportA } = await db
    .from('ai_reports')
    .select('*')
    .eq('id', report_id_a)
    .eq('site_id', site_id)
    .single();

  const { data: reportB } = await db
    .from('ai_reports')
    .select('*')
    .eq('id', report_id_b)
    .eq('site_id', site_id)
    .single();

  if (!reportA || !reportB) {
    return NextResponse.json({ error: 'One or both reports not found' }, { status: 404 });
  }

  // Get AI config
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
    const result = await compareReports(
      config as AIConfig,
      {
        period: `${reportA.period_start} to ${reportA.period_end}`,
        data_snapshot: reportA.data_snapshot,
        analysis: typeof reportA.analysis === 'string' ? JSON.parse(reportA.analysis) : reportA.analysis,
      },
      {
        period: `${reportB.period_start} to ${reportB.period_end}`,
        data_snapshot: reportB.data_snapshot,
        analysis: typeof reportB.analysis === 'string' ? JSON.parse(reportB.analysis) : reportB.analysis,
      },
    );

    return NextResponse.json({
      comparison: result.analysis,
      tokens_used: result.tokens_used,
      report_a: { id: reportA.id, period: `${reportA.period_start} to ${reportA.period_end}` },
      report_b: { id: reportB.id, period: `${reportB.period_start} to ${reportB.period_end}` },
    });
  } catch (err: any) {
    console.error('AI comparison error:', err);
    return NextResponse.json({ error: err.message || 'Comparison failed' }, { status: 500 });
  }
}
