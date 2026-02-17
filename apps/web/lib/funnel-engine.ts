import { createServiceClient } from '@/lib/supabase/server';

interface FunnelStep {
  name: string;
  type: string;
  match?: string;
  value?: string;
  event_name?: string;
  form_id?: string;
}

interface Funnel {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  steps: FunnelStep[];
  window_hours: number;
}

interface StepResult {
  name: string;
  count: number;
  dropoff: number;
  conversion_rate: number;
}

function eventMatchesStep(event: Record<string, unknown>, step: FunnelStep): boolean {
  switch (step.type) {
    case 'page_visit': {
      if (event.event_type !== 'pageview') return false;
      const path = String(event.path || '');
      const val = step.value || '';
      switch (step.match) {
        case 'exact': return path === val;
        case 'contains': return path.includes(val);
        case 'regex': return new RegExp(val).test(path);
        default: return path === val;
      }
    }
    case 'event': {
      if (event.event_type !== 'custom') return false;
      return event.event_name === step.event_name;
    }
    case 'form_submit': {
      if (event.event_type !== 'form_submit') return false;
      if (step.form_id) return event.form_id === step.form_id;
      return true;
    }
    default:
      return false;
  }
}

export async function computeFunnelStats(
  funnelId: string,
  siteId: string,
  fromDate: string,
  toDate: string
): Promise<{ funnel: Funnel; steps: StepResult[] }> {
  const supabase = await createServiceClient();

  const { data: funnel, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('id', funnelId)
    .eq('site_id', siteId)
    .single();

  if (error || !funnel) {
    throw new Error('Funnel not found');
  }

  const f = funnel as Funnel;
  const steps = f.steps;

  if (!steps.length) {
    return { funnel: f, steps: [] };
  }

  // Get all sessions in date range
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('site_id', siteId)
    .gte('started_at', fromDate)
    .lte('started_at', toDate);

  if (!sessions?.length) {
    return {
      funnel: f,
      steps: steps.map((s) => ({
        name: s.name,
        count: 0,
        dropoff: 0,
        conversion_rate: 0,
      })),
    };
  }

  const sessionIds = sessions.map((s) => s.id);
  const results: StepResult[] = [];
  let previousCount = sessionIds.length;

  // For each step, find sessions where events match in sequence
  // We process in batches to avoid memory issues
  const batchSize = 500;
  let qualifiedSessions = new Set(sessionIds);

  for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
    const step = steps[stepIdx];
    const nextQualified = new Set<string>();
    const qualifiedArray = Array.from(qualifiedSessions);

    for (let i = 0; i < qualifiedArray.length; i += batchSize) {
      const batch = qualifiedArray.slice(i, i + batchSize);
      const { data: events } = await supabase
        .from('events')
        .select('session_id, event_type, event_name, path, form_id')
        .in('session_id', batch)
        .eq('site_id', siteId);

      if (events) {
        for (const event of events) {
          if (eventMatchesStep(event as Record<string, unknown>, step)) {
            nextQualified.add(event.session_id);
          }
        }
      }
    }

    const count = nextQualified.size;
    const dropoff = previousCount - count;
    const conversionRate = previousCount > 0 ? Math.round((count / previousCount) * 1000) / 10 : 0;

    results.push({
      name: step.name,
      count,
      dropoff,
      conversion_rate: conversionRate,
    });

    previousCount = count;
    qualifiedSessions = nextQualified;
  }

  return { funnel: f, steps: results };
}
