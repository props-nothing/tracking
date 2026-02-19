import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AIConfig {
  id: string;
  site_id: string;
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'manual';
  schedule_hour: number;
  custom_prompt: string | null;
  included_sections: string[];
  comparison_enabled: boolean;
  comparison_period: 'previous_period' | 'previous_month' | 'previous_year';
  openai_model: string;
  max_tokens: number;
  max_completion_tokens?: number;
}

export interface AIHighlight {
  type: 'positive' | 'negative' | 'neutral' | 'opportunity';
  title: string;
  detail: string;
  metric?: string;
  change_pct?: number;
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  expected_impact: string;
}

export interface AIAnalysis {
  summary: string;
  highlights: AIHighlight[];
  lead_insights: {
    top_sources: string;
    recommendations: string[];
    quality_assessment: string;
  };
  campaign_insights: {
    best_performing: string;
    worst_performing: string;
    budget_recommendations: string[];
    new_ideas: string[];
  };
  traffic_insights: {
    trends: string;
    anomalies: string[];
    opportunities: string[];
  };
  page_insights: {
    top_performers: string;
    underperformers: string;
    optimization_suggestions: string[];
  };
  comparison?: {
    summary: string;
    improvements: string[];
    regressions: string[];
    campaign_comparison: string;
  };
  action_items: ActionItem[];
  confidence_notes: string;
}

export interface DataPayload {
  site_name: string;
  site_domain: string;
  period: { start: string; end: string };
  comparison_period?: { start: string; end: string };
  metrics: {
    visitors: number;
    pageviews: number;
    sessions: number;
    bounce_rate: number;
    avg_session_duration_ms: number;
    avg_engaged_time_ms: number;
    form_submissions: number;
    total_revenue: number;
  };
  comparison_metrics?: {
    visitors: number;
    pageviews: number;
    sessions: number;
    bounce_rate: number;
    avg_session_duration_ms: number;
    avg_engaged_time_ms: number;
    form_submissions: number;
    total_revenue: number;
  };
  daily_trend: { day: string; visitors: number; pageviews: number; sessions: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_referrers: { source: string; count: number }[];
  countries: { country: string; count: number }[];
  devices: { device: string; count: number }[];
  utm_sources: { source: string; count: number }[];
  utm_mediums: { medium: string; count: number }[];
  utm_campaigns: { campaign: string; count: number }[];
  leads: {
    total: number;
    new: number;
    by_source: { source: string; count: number }[];
    by_medium: { medium: string; count: number }[];
    by_campaign: { campaign: string; count: number }[];
  };
  goals: { name: string; conversions: number; revenue: number }[];
  forms: { form_id: string; submissions: number; abandonments: number; completion_rate: number }[];
  previous_ai_summaries?: string[];
}

/* ------------------------------------------------------------------ */
/*  Helper: get OpenAI client                                          */
/* ------------------------------------------------------------------ */

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');
  return new OpenAI({ apiKey });
}

/* ------------------------------------------------------------------ */
/*  Helper: compute comparison period dates                            */
/* ------------------------------------------------------------------ */

export function getComparisonDates(
  periodStart: string,
  periodEnd: string,
  mode: 'previous_period' | 'previous_month' | 'previous_year'
): { start: string; end: string } {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const durationMs = end.getTime() - start.getTime();

  switch (mode) {
    case 'previous_period': {
      const compEnd = new Date(start.getTime() - 86400000); // day before start
      const compStart = new Date(compEnd.getTime() - durationMs);
      return { start: compStart.toISOString().slice(0, 10), end: compEnd.toISOString().slice(0, 10) };
    }
    case 'previous_month': {
      const compStart = new Date(start);
      compStart.setMonth(compStart.getMonth() - 1);
      const compEnd = new Date(end);
      compEnd.setMonth(compEnd.getMonth() - 1);
      return { start: compStart.toISOString().slice(0, 10), end: compEnd.toISOString().slice(0, 10) };
    }
    case 'previous_year': {
      const compStart = new Date(start);
      compStart.setFullYear(compStart.getFullYear() - 1);
      const compEnd = new Date(end);
      compEnd.setFullYear(compEnd.getFullYear() - 1);
      return { start: compStart.toISOString().slice(0, 10), end: compEnd.toISOString().slice(0, 10) };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Build data payload from database                                   */
/* ------------------------------------------------------------------ */

export async function buildDataPayload(
  db: SupabaseClient,
  siteId: string,
  periodStart: string,
  periodEnd: string,
): Promise<Omit<DataPayload, 'comparison_period' | 'comparison_metrics' | 'previous_ai_summaries'>> {
  const fromStr = `${periodStart}T00:00:00Z`;
  const toStr = `${periodEnd}T23:59:59Z`;

  // Get site info
  const { data: site } = await db
    .from('sites')
    .select('name, domain')
    .eq('id', siteId)
    .single();

  // Fetch core metrics from events
  const { data: events } = await db
    .from('events')
    .select('event_type, visitor_hash, session_id, path, referrer_hostname, country_code, device_type, browser, os, utm_source, utm_medium, utm_campaign, engaged_time_ms, is_bounce, revenue, timestamp')
    .eq('site_id', siteId)
    .gte('timestamp', fromStr)
    .lte('timestamp', toStr);

  const evts = events || [];
  const pvEvents = evts.filter(e => e.event_type === 'pageview');
  const visitors = new Set(evts.map(e => e.visitor_hash)).size;
  const pageviews = pvEvents.length;
  const sessions = new Set(evts.map(e => e.session_id)).size;
  // Bounce rate will be calculated from sessions table below
  const engagedTimes = evts.filter(e => e.engaged_time_ms).map(e => e.engaged_time_ms!);
  const avgEngaged = engagedTimes.length > 0
    ? Math.round(engagedTimes.reduce((a: number, b: number) => a + b, 0) / engagedTimes.length)
    : 0;

  // Sessions for avg duration and accurate bounce rate
  const { data: sessRows } = await db
    .from('sessions')
    .select('duration_ms, is_bounce')
    .eq('site_id', siteId)
    .gte('started_at', fromStr)
    .lte('started_at', toStr);
  const durations = (sessRows || []).filter(s => s.duration_ms > 0).map(s => s.duration_ms);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
    : 0;
  // Bounce rate from sessions table — event-level is_bounce is unreliable
  const bounces = (sessRows || []).filter(s => s.is_bounce).length;
  const bounceRate = sessions > 0 ? Math.round((bounces / sessions) * 100) : 0;

  // Form submissions count
  const formSubmissions = evts.filter(e => e.event_type === 'form_submit').length;
  const totalRevenue = evts.reduce((sum, e) => sum + (e.revenue || 0), 0);

  // Daily trend
  const dailyMap: Record<string, { visitors: Set<string>; pageviews: number; sessions: Set<string> }> = {};
  for (const e of evts) {
    const day = e.timestamp.split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { visitors: new Set(), pageviews: 0, sessions: new Set() };
    dailyMap[day].visitors.add(e.visitor_hash);
    dailyMap[day].sessions.add(e.session_id);
    if (e.event_type === 'pageview') dailyMap[day].pageviews++;
  }
  const daily_trend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({ day, visitors: d.visitors.size, pageviews: d.pageviews, sessions: d.sessions.size }));

  // Top-N helper
  function countBy<T>(arr: T[], keyFn: (item: T) => string | null | undefined, limit = 20) {
    const counts: Record<string, number> = {};
    for (const item of arr) {
      const key = keyFn(item);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  // Page views with visitor count
  const pageMap: Record<string, { views: number; visitors: Set<string> }> = {};
  for (const e of pvEvents) {
    if (!pageMap[e.path]) pageMap[e.path] = { views: 0, visitors: new Set() };
    pageMap[e.path].views++;
    pageMap[e.path].visitors.add(e.visitor_hash);
  }
  const top_pages = Object.entries(pageMap)
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 20)
    .map(([path, d]) => ({ path, views: d.views, visitors: d.visitors.size }));

  const top_referrers = countBy(evts, e => e.referrer_hostname).map(([source, count]) => ({ source, count }));
  const countries = countBy(evts, e => e.country_code).map(([country, count]) => ({ country, count }));
  const devices = countBy(evts, e => e.device_type).map(([device, count]) => ({ device, count }));
  const utm_sources = countBy(evts, e => e.utm_source).map(([source, count]) => ({ source, count }));
  const utm_mediums = countBy(evts, e => e.utm_medium).map(([medium, count]) => ({ medium, count }));
  const utm_campaigns = countBy(evts, e => e.utm_campaign).map(([campaign, count]) => ({ campaign, count }));

  // Leads
  const { data: leads } = await db
    .from('leads')
    .select('status, utm_source, utm_medium, utm_campaign, referrer_hostname')
    .eq('site_id', siteId)
    .gte('created_at', fromStr)
    .lte('created_at', toStr);

  const leadRows = leads || [];
  const leadSourceMap: Record<string, number> = {};
  const leadMediumMap: Record<string, number> = {};
  const leadCampaignMap: Record<string, number> = {};
  for (const l of leadRows) {
    const src = l.utm_source || l.referrer_hostname || 'direct';
    leadSourceMap[src] = (leadSourceMap[src] || 0) + 1;
    if (l.utm_medium) leadMediumMap[l.utm_medium] = (leadMediumMap[l.utm_medium] || 0) + 1;
    if (l.utm_campaign) leadCampaignMap[l.utm_campaign] = (leadCampaignMap[l.utm_campaign] || 0) + 1;
  }

  // Goals
  const { data: goalConversions } = await db
    .from('goal_conversions')
    .select('goal_id, revenue, goals(name)')
    .eq('site_id', siteId)
    .gte('converted_at', fromStr)
    .lte('converted_at', toStr);

  const goalMap: Record<string, { name: string; conversions: number; revenue: number }> = {};
  for (const gc of goalConversions || []) {
    const name = (gc as any).goals?.name || gc.goal_id;
    if (!goalMap[gc.goal_id]) goalMap[gc.goal_id] = { name, conversions: 0, revenue: 0 };
    goalMap[gc.goal_id].conversions++;
    goalMap[gc.goal_id].revenue += gc.revenue || 0;
  }

  // Form stats
  const { data: formStats } = await db
    .from('form_stats')
    .select('form_id, submissions, abandonments, completion_rate_pct')
    .eq('site_id', siteId);

  return {
    site_name: site?.name || '',
    site_domain: site?.domain || '',
    period: { start: periodStart, end: periodEnd },
    metrics: {
      visitors,
      pageviews,
      sessions,
      bounce_rate: bounceRate,
      avg_session_duration_ms: avgDuration,
      avg_engaged_time_ms: avgEngaged,
      form_submissions: formSubmissions,
      total_revenue: totalRevenue,
    },
    daily_trend,
    top_pages,
    top_referrers,
    countries,
    devices,
    utm_sources,
    utm_mediums,
    utm_campaigns,
    leads: {
      total: leadRows.length,
      new: leadRows.filter(l => l.status === 'new').length,
      by_source: Object.entries(leadSourceMap).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count })),
      by_medium: Object.entries(leadMediumMap).sort((a, b) => b[1] - a[1]).map(([medium, count]) => ({ medium, count })),
      by_campaign: Object.entries(leadCampaignMap).sort((a, b) => b[1] - a[1]).map(([campaign, count]) => ({ campaign, count })),
    },
    goals: Object.values(goalMap),
    forms: (formStats || []).map(f => ({
      form_id: f.form_id,
      submissions: f.submissions || 0,
      abandonments: f.abandonments || 0,
      completion_rate: f.completion_rate_pct || 0,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Build the prompt                                                   */
/* ------------------------------------------------------------------ */

export function buildSystemPrompt(config: AIConfig, hasComparison: boolean): string {
  return `You are a senior digital marketing analyst and data scientist. You analyze web analytics data and provide actionable insights for website owners.

Your analysis must be based strictly on the data provided. Do not hallucinate metrics or make up numbers.

Return your analysis as a JSON object with this exact structure:
{
  "summary": "2-3 sentence executive summary of the most important findings",
  "highlights": [
    { "type": "positive|negative|neutral|opportunity", "title": "Short title", "detail": "Explanation", "metric": "optional metric name", "change_pct": optional_number }
  ],
  "lead_insights": {
    "top_sources": "Where most/best leads come from",
    "recommendations": ["How to get more leads"],
    "quality_assessment": "Lead quality analysis"
  },
  "campaign_insights": {
    "best_performing": "Which UTM campaigns win and why",
    "worst_performing": "Which campaigns underperform",
    "budget_recommendations": ["Where to shift marketing budget"],
    "new_ideas": ["New campaign ideas based on the data patterns"]
  },
  "traffic_insights": {
    "trends": "Traffic trend description",
    "anomalies": ["Any unusual spikes or drops"],
    "opportunities": ["Growth opportunities"]
  },
  "page_insights": {
    "top_performers": "Top performing pages and why",
    "underperformers": "Pages that need attention",
    "optimization_suggestions": ["Specific page optimization suggestions"]
  },
  ${hasComparison ? `"comparison": {
    "summary": "Overall comparison between the two periods",
    "improvements": ["Things that improved"],
    "regressions": ["Things that got worse"],
    "campaign_comparison": "Detailed campaign performance comparison"
  },` : ''}
  "action_items": [
    { "priority": "high|medium|low", "category": "leads|campaigns|traffic|pages|technical", "action": "Specific action to take", "expected_impact": "What improvement to expect" }
  ],
  "confidence_notes": "Caveats about data quality, sample size, or limitations"
}

Rules:
- Provide 3-5 highlights
- Provide 3-5 action items, prioritized by expected impact
- Be specific with numbers and percentages from the data
- If lead data is empty, still provide campaign and traffic insights
- If comparison data is available, always include the comparison section
- Focus on actionable recommendations, not just observations
${config.custom_prompt ? `\nAdditional instructions from the site owner:\n${config.custom_prompt}` : ''}`;
}

export function buildUserPrompt(
  data: DataPayload,
  comparisonData?: Omit<DataPayload, 'site_name' | 'site_domain' | 'comparison_period' | 'comparison_metrics' | 'previous_ai_summaries'> | null,
  previousSummaries?: string[],
): string {
  const parts: string[] = [];

  parts.push(`## Website: ${data.site_name} (${data.site_domain})`);
  parts.push(`## Period: ${data.period.start} to ${data.period.end}`);
  parts.push('');

  // Core metrics
  parts.push('### Core Metrics');
  parts.push(`- Visitors: ${data.metrics.visitors}`);
  parts.push(`- Pageviews: ${data.metrics.pageviews}`);
  parts.push(`- Sessions: ${data.metrics.sessions}`);
  parts.push(`- Bounce Rate: ${data.metrics.bounce_rate}%`);
  parts.push(`- Avg Session Duration: ${Math.round(data.metrics.avg_session_duration_ms / 1000)}s`);
  parts.push(`- Avg Engaged Time: ${Math.round(data.metrics.avg_engaged_time_ms / 1000)}s`);
  parts.push(`- Form Submissions: ${data.metrics.form_submissions}`);
  if (data.metrics.total_revenue > 0) parts.push(`- Total Revenue: €${data.metrics.total_revenue.toFixed(2)}`);
  parts.push('');

  // Daily trend
  if (data.daily_trend.length > 0) {
    parts.push('### Daily Trend (last entries)');
    for (const d of data.daily_trend.slice(-14)) {
      parts.push(`  ${d.day}: ${d.visitors} visitors, ${d.pageviews} pageviews, ${d.sessions} sessions`);
    }
    parts.push('');
  }

  // Top pages
  if (data.top_pages.length > 0) {
    parts.push('### Top Pages');
    for (const p of data.top_pages.slice(0, 15)) {
      parts.push(`  ${p.path}: ${p.views} views, ${p.visitors} unique visitors`);
    }
    parts.push('');
  }

  // Referrers
  if (data.top_referrers.length > 0) {
    parts.push('### Top Referrers');
    for (const r of data.top_referrers.slice(0, 10)) {
      parts.push(`  ${r.source}: ${r.count}`);
    }
    parts.push('');
  }

  // Countries
  if (data.countries.length > 0) {
    parts.push('### Top Countries');
    for (const c of data.countries.slice(0, 10)) {
      parts.push(`  ${c.country}: ${c.count}`);
    }
    parts.push('');
  }

  // Devices
  if (data.devices.length > 0) {
    parts.push('### Device Breakdown');
    for (const d of data.devices) {
      parts.push(`  ${d.device}: ${d.count}`);
    }
    parts.push('');
  }

  // UTM
  if (data.utm_sources.length > 0) {
    parts.push('### UTM Sources');
    for (const u of data.utm_sources) parts.push(`  ${u.source}: ${u.count}`);
    parts.push('');
  }
  if (data.utm_mediums.length > 0) {
    parts.push('### UTM Mediums');
    for (const u of data.utm_mediums) parts.push(`  ${u.medium}: ${u.count}`);
    parts.push('');
  }
  if (data.utm_campaigns.length > 0) {
    parts.push('### UTM Campaigns');
    for (const u of data.utm_campaigns) parts.push(`  ${u.campaign}: ${u.count}`);
    parts.push('');
  }

  // Leads
  parts.push('### Lead Data');
  parts.push(`- Total Leads: ${data.leads.total}`);
  parts.push(`- New Leads: ${data.leads.new}`);
  if (data.leads.by_source.length > 0) {
    parts.push('- Lead Sources:');
    for (const s of data.leads.by_source) parts.push(`    ${s.source}: ${s.count}`);
  }
  if (data.leads.by_medium.length > 0) {
    parts.push('- Lead Mediums:');
    for (const m of data.leads.by_medium) parts.push(`    ${m.medium}: ${m.count}`);
  }
  if (data.leads.by_campaign.length > 0) {
    parts.push('- Lead Campaigns:');
    for (const c of data.leads.by_campaign) parts.push(`    ${c.campaign}: ${c.count}`);
  }
  parts.push('');

  // Goals
  if (data.goals.length > 0) {
    parts.push('### Goal Conversions');
    for (const g of data.goals) {
      parts.push(`  ${g.name}: ${g.conversions} conversions${g.revenue > 0 ? `, €${g.revenue.toFixed(2)} revenue` : ''}`);
    }
    parts.push('');
  }

  // Forms
  if (data.forms.length > 0) {
    parts.push('### Form Analytics');
    for (const f of data.forms) {
      parts.push(`  ${f.form_id}: ${f.submissions} submissions, ${f.abandonments} abandonments, ${f.completion_rate}% completion`);
    }
    parts.push('');
  }

  // Comparison data
  if (comparisonData) {
    parts.push('---');
    parts.push(`## COMPARISON PERIOD: ${comparisonData.period.start} to ${comparisonData.period.end}`);
    parts.push('');
    parts.push('### Comparison Core Metrics');
    parts.push(`- Visitors: ${comparisonData.metrics.visitors}`);
    parts.push(`- Pageviews: ${comparisonData.metrics.pageviews}`);
    parts.push(`- Sessions: ${comparisonData.metrics.sessions}`);
    parts.push(`- Bounce Rate: ${comparisonData.metrics.bounce_rate}%`);
    parts.push(`- Form Submissions: ${comparisonData.metrics.form_submissions}`);
    if (comparisonData.metrics.total_revenue > 0) parts.push(`- Revenue: €${comparisonData.metrics.total_revenue.toFixed(2)}`);
    parts.push('');

    if (comparisonData.utm_campaigns.length > 0) {
      parts.push('### Comparison UTM Campaigns');
      for (const u of comparisonData.utm_campaigns) parts.push(`  ${u.campaign}: ${u.count}`);
      parts.push('');
    }

    parts.push('### Comparison Leads');
    parts.push(`- Total Leads: ${comparisonData.leads.total}`);
    parts.push(`- New Leads: ${comparisonData.leads.new}`);
    if (comparisonData.leads.by_source.length > 0) {
      parts.push('- Lead Sources:');
      for (const s of comparisonData.leads.by_source) parts.push(`    ${s.source}: ${s.count}`);
    }
    parts.push('');
  }

  // AI Memory: previous summaries
  if (previousSummaries && previousSummaries.length > 0) {
    parts.push('---');
    parts.push('## PREVIOUS ANALYSIS SUMMARIES (for context/trends):');
    for (let i = 0; i < previousSummaries.length; i++) {
      parts.push(`${i + 1}. ${previousSummaries[i]}`);
    }
    parts.push('');
  }

  parts.push('Please analyze this data and return your insights as JSON.');

  return parts.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Run analysis via OpenAI                                           */
/* ------------------------------------------------------------------ */

export async function analyzeData(
  config: AIConfig,
  data: DataPayload,
  comparisonData?: Omit<DataPayload, 'site_name' | 'site_domain' | 'comparison_period' | 'comparison_metrics' | 'previous_ai_summaries'> | null,
  previousSummaries?: string[],
): Promise<{ analysis: AIAnalysis; tokens_used: number; model_used: string; prompt_used: string }> {
  const openai = getOpenAIClient();
  const hasComparison = !!comparisonData;

  const systemPrompt = buildSystemPrompt(config, hasComparison);
  const userPrompt = buildUserPrompt(data, comparisonData, previousSummaries);
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  const response = await openai.chat.completions.create({
    model: config.openai_model || 'gpt-5.2-2025-12-11',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: config.max_completion_tokens || config.max_tokens || 3000,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '{}';
  let analysis: AIAnalysis;

  try {
    analysis = JSON.parse(content) as AIAnalysis;
  } catch {
    analysis = {
      summary: content,
      highlights: [],
      lead_insights: { top_sources: '', recommendations: [], quality_assessment: '' },
      campaign_insights: { best_performing: '', worst_performing: '', budget_recommendations: [], new_ideas: [] },
      traffic_insights: { trends: '', anomalies: [], opportunities: [] },
      page_insights: { top_performers: '', underperformers: '', optimization_suggestions: [] },
      action_items: [],
      confidence_notes: 'Failed to parse structured response from AI.',
    };
  }

  const tokensUsed = response.usage?.total_tokens || 0;

  return {
    analysis,
    tokens_used: tokensUsed,
    model_used: config.openai_model || 'gpt-5.2-2025-12-11',
    prompt_used: fullPrompt,
  };
}

/* ------------------------------------------------------------------ */
/*  Compare two AI reports                                             */
/* ------------------------------------------------------------------ */

export async function compareReports(
  config: AIConfig,
  reportA: { period: string; data_snapshot: DataPayload; analysis: AIAnalysis },
  reportB: { period: string; data_snapshot: DataPayload; analysis: AIAnalysis },
): Promise<{ analysis: AIAnalysis; tokens_used: number }> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are a senior digital marketing analyst. Compare two analytics periods and provide insights on what changed, what improved, what regressed, and what actions to take.

Return your analysis as a JSON object with this exact structure:
{
  "summary": "2-3 sentence comparison summary",
  "highlights": [
    { "type": "positive|negative|neutral|opportunity", "title": "Short title", "detail": "Explanation", "change_pct": optional_number }
  ],
  "lead_insights": { "top_sources": "", "recommendations": [], "quality_assessment": "" },
  "campaign_insights": { "best_performing": "", "worst_performing": "", "budget_recommendations": [], "new_ideas": [] },
  "traffic_insights": { "trends": "", "anomalies": [], "opportunities": [] },
  "page_insights": { "top_performers": "", "underperformers": "", "optimization_suggestions": [] },
  "comparison": {
    "summary": "Detailed comparison",
    "improvements": ["Things that improved"],
    "regressions": ["Things that got worse"],
    "campaign_comparison": "Detailed campaign A/B analysis"
  },
  "action_items": [
    { "priority": "high|medium|low", "category": "leads|campaigns|traffic|pages|technical", "action": "Action", "expected_impact": "Impact" }
  ],
  "confidence_notes": "Caveats"
}
${config.custom_prompt ? `\nAdditional instructions: ${config.custom_prompt}` : ''}`;

  const userPrompt = `## PERIOD A: ${reportA.period}
### Metrics
${JSON.stringify(reportA.data_snapshot.metrics, null, 2)}
### Previous AI Summary
${reportA.analysis.summary}

---

## PERIOD B: ${reportB.period}
### Metrics
${JSON.stringify(reportB.data_snapshot.metrics, null, 2)}
### Previous AI Summary
${reportB.analysis.summary}

---

Compare these two periods and provide actionable insights.`;

  const response = await openai.chat.completions.create({
    model: config.openai_model || 'gpt-5.2-2025-12-11',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: config.max_completion_tokens || config.max_tokens || 3000,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '{}';
  let analysis: AIAnalysis;
  try {
    analysis = JSON.parse(content) as AIAnalysis;
  } catch {
    analysis = {
      summary: content,
      highlights: [],
      lead_insights: { top_sources: '', recommendations: [], quality_assessment: '' },
      campaign_insights: { best_performing: '', worst_performing: '', budget_recommendations: [], new_ideas: [] },
      traffic_insights: { trends: '', anomalies: [], opportunities: [] },
      page_insights: { top_performers: '', underperformers: '', optimization_suggestions: [] },
      action_items: [],
      confidence_notes: 'Failed to parse structured response.',
    };
  }

  return {
    analysis,
    tokens_used: response.usage?.total_tokens || 0,
  };
}
