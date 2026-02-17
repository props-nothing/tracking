interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function sendWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tracking-Webhooks/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch (error) {
    console.error(`Webhook delivery failed for ${url}:`, error);
    return false;
  }
}

export async function sendSlackWebhook(
  webhookUrl: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch (error) {
    console.error('Slack webhook delivery failed:', error);
    return false;
  }
}

export async function dispatchGoalWebhooks(goal: {
  name: string;
  notify_webhook: string | null;
  notify_slack_webhook: string | null;
}, conversion: {
  goal_id: string;
  event_id: number;
  revenue: number | null;
}) {
  const promises: Promise<boolean>[] = [];

  if (goal.notify_webhook) {
    promises.push(
      sendWebhook(goal.notify_webhook, {
        event: 'goal.converted',
        data: {
          goal_name: goal.name,
          goal_id: conversion.goal_id,
          event_id: conversion.event_id,
          revenue: conversion.revenue,
        },
        timestamp: new Date().toISOString(),
      })
    );
  }

  if (goal.notify_slack_webhook) {
    const revenueStr = conversion.revenue ? ` ($${conversion.revenue})` : '';
    promises.push(
      sendSlackWebhook(
        goal.notify_slack_webhook,
        `🎯 Goal "${goal.name}" converted${revenueStr}`
      )
    );
  }

  await Promise.allSettled(promises);
}
