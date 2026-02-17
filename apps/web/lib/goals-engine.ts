import { createServiceClient } from '@/lib/supabase/server';

interface GoalCondition {
  type: string;
  match?: string;
  value?: string;
  event_name?: string;
  property?: string;
  operator?: string;
  form_id?: string;
  min_pct?: number;
  min_seconds?: number;
  path?: string;
}

interface Goal {
  id: string;
  site_id: string;
  name: string;
  goal_type: string;
  conditions: GoalCondition[] | { operator: string; conditions: GoalCondition[] };
  revenue_value: number | null;
  use_dynamic_revenue: boolean;
  count_mode: string;
  notify_webhook: string | null;
  notify_email: string[] | null;
  notify_slack_webhook: string | null;
}

interface EventData {
  id: number;
  site_id: string;
  event_type: string;
  event_name: string | null;
  event_data: Record<string, unknown>;
  path: string;
  session_id: string;
  visitor_hash: string;
  scroll_depth_pct: number | null;
  engaged_time_ms: number | null;
  form_id: string | null;
  revenue: number | null;
  referrer_hostname: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

function matchPath(pattern: string, path: string): boolean {
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(path);
  }
  return pattern === path;
}

function evaluateCondition(condition: GoalCondition, event: EventData): boolean {
  switch (condition.type) {
    case 'page_visit': {
      if (event.event_type !== 'pageview') return false;
      const val = condition.value || '';
      switch (condition.match) {
        case 'exact': return event.path === val;
        case 'contains': return event.path.includes(val);
        case 'regex': return new RegExp(val).test(event.path);
        default: return event.path === val;
      }
    }
    case 'event': {
      if (event.event_type !== 'custom') return false;
      if (event.event_name !== condition.event_name) return false;
      if (condition.property && condition.operator && condition.value !== undefined) {
        const propValue = String(event.event_data?.[condition.property] ?? '');
        switch (condition.operator) {
          case 'equals': return propValue === condition.value;
          case 'contains': return propValue.includes(condition.value);
          case 'regex': return new RegExp(condition.value).test(propValue);
          default: return propValue === condition.value;
        }
      }
      return true;
    }
    case 'form_submit': {
      if (event.event_type !== 'form_submit') return false;
      if (condition.form_id && event.form_id !== condition.form_id) return false;
      return true;
    }
    case 'scroll_depth': {
      if (!event.scroll_depth_pct) return false;
      if (condition.path && !matchPath(condition.path, event.path)) return false;
      return event.scroll_depth_pct >= (condition.min_pct || 0);
    }
    case 'time_on_page': {
      if (!event.engaged_time_ms) return false;
      if (condition.path && !matchPath(condition.path, event.path)) return false;
      const minMs = (condition.min_seconds || 0) * 1000;
      return event.engaged_time_ms >= minMs;
    }
    case 'click': {
      if (event.event_type !== 'custom' || event.event_name !== 'click') return false;
      if (condition.value) {
        const selector = String(event.event_data?.selector ?? '');
        switch (condition.match) {
          case 'exact': return selector === condition.value;
          case 'contains': return selector.includes(condition.value);
          case 'regex': return new RegExp(condition.value).test(selector);
          default: return selector === condition.value;
        }
      }
      return true;
    }
    case 'revenue': {
      if (!event.revenue) return false;
      const minRevenue = parseFloat(condition.value || '0');
      return event.revenue >= minRevenue;
    }
    default:
      return false;
  }
}

async function checkAlreadyConverted(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  goalId: string,
  sessionId: string,
  countMode: string
): Promise<boolean> {
  if (countMode !== 'once_per_session') return false;
  const { count } = await supabase
    .from('goal_conversions')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .eq('session_id', sessionId);
  return (count || 0) > 0;
}

async function recordConversion(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  goal: Goal,
  event: EventData
) {
  const revenue = goal.use_dynamic_revenue
    ? event.revenue
    : goal.revenue_value;

  await supabase.from('goal_conversions').insert({
    goal_id: goal.id,
    site_id: goal.site_id,
    session_id: event.session_id,
    visitor_hash: event.visitor_hash,
    event_id: event.id,
    referrer_hostname: event.referrer_hostname,
    utm_source: event.utm_source,
    utm_medium: event.utm_medium,
    utm_campaign: event.utm_campaign,
    entry_path: event.path,
    conversion_path: event.path,
    revenue,
  });

  // Fire notifications
  if (goal.notify_webhook) {
    fetch(goal.notify_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_id: goal.id,
        goal_name: goal.name,
        event_id: event.id,
        revenue,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  if (goal.notify_slack_webhook) {
    fetch(goal.notify_slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🎯 Goal "${goal.name}" converted${revenue ? ` ($${revenue})` : ''}`,
      }),
    }).catch(() => {});
  }
}

export async function evaluateGoals(event: EventData) {
  const supabase = await createServiceClient();

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('site_id', event.site_id)
    .eq('active', true);

  if (!goals?.length) return;

  for (const goal of goals as Goal[]) {
    const alreadyConverted = await checkAlreadyConverted(
      supabase,
      goal.id,
      event.session_id,
      goal.count_mode
    );
    if (alreadyConverted) continue;

    let matched = false;
    const conditions = goal.conditions;

    if (Array.isArray(conditions)) {
      // Simple conditions — any match triggers
      matched = conditions.some((c) => evaluateCondition(c, event));
    } else if (conditions && typeof conditions === 'object') {
      const compound = conditions as { operator: string; conditions: GoalCondition[] };
      if (compound.operator === 'AND') {
        // For AND, we need to check session history
        const { data: sessionEvents } = await supabase
          .from('events')
          .select('*')
          .eq('session_id', event.session_id)
          .order('timestamp', { ascending: true });

        const allEvents = [...(sessionEvents || []), event];
        matched = compound.conditions.every((c) =>
          allEvents.some((e) => evaluateCondition(c, e as EventData))
        );
      } else if (compound.operator === 'SEQUENCE') {
        const { data: sessionEvents } = await supabase
          .from('events')
          .select('*')
          .eq('session_id', event.session_id)
          .order('timestamp', { ascending: true });

        const allEvents = [...(sessionEvents || []), event];
        let seqIdx = 0;
        for (const e of allEvents) {
          if (seqIdx < compound.conditions.length &&
              evaluateCondition(compound.conditions[seqIdx], e as EventData)) {
            seqIdx++;
          }
        }
        matched = seqIdx >= compound.conditions.length;
      } else if (compound.operator === 'OR') {
        matched = compound.conditions.some((c) => evaluateCondition(c, event));
      }
    }

    if (matched) {
      await recordConversion(supabase, goal, event);
    }
  }
}
