import { z } from 'zod';

export const collectPayloadSchema = z.object({
  site_id: z.string().uuid(),
  url: z.string().url().max(2048),
  path: z.string().max(2048),
  hostname: z.string().max(255),
  page_title: z.string().max(500).nullable().optional(),
  referrer: z.string().max(2048).nullable().optional(),
  referrer_hostname: z.string().max(255).nullable().optional(),
  utm_source: z.string().max(255).nullable().optional(),
  utm_medium: z.string().max(255).nullable().optional(),
  utm_campaign: z.string().max(255).nullable().optional(),
  utm_term: z.string().max(255).nullable().optional(),
  utm_content: z.string().max(255).nullable().optional(),
  session_id: z.string().uuid(),
  custom_props: z.record(z.string(), z.any()).optional().default({}),
  screen_width: z.number().int().positive().nullable().optional(),
  screen_height: z.number().int().positive().nullable().optional(),
  viewport_width: z.number().int().positive().nullable().optional(),
  viewport_height: z.number().int().positive().nullable().optional(),
  language: z.string().max(20).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  connection_type: z.string().max(20).nullable().optional(),
  event_type: z.enum([
    'pageview', 'custom', 'form_submit', 'form_abandon',
    'outbound_click', 'file_download', 'scroll_depth',
    'rage_click', 'dead_click', 'element_visible',
    'copy', 'print', 'error', 'ecommerce',
  ]).default('pageview'),
  event_name: z.string().max(255).nullable().optional(),
  event_data: z.record(z.string(), z.any()).optional().default({}),
  scroll_depth_pct: z.number().int().min(0).max(100).nullable().optional(),
  time_on_page_ms: z.number().int().min(0).nullable().optional(),
  engaged_time_ms: z.number().int().min(0).nullable().optional(),
  ttfb_ms: z.number().int().nullable().optional(),
  fcp_ms: z.number().int().nullable().optional(),
  lcp_ms: z.number().int().nullable().optional(),
  cls: z.number().nullable().optional(),
  inp_ms: z.number().int().nullable().optional(),
  fid_ms: z.number().int().nullable().optional(),
  form_id: z.string().max(255).nullable().optional(),
  form_action: z.string().max(2048).nullable().optional(),
  form_fields: z.any().nullable().optional(),
  form_last_field: z.string().max(255).nullable().optional(),
  form_time_to_submit_ms: z.number().int().min(0).nullable().optional(),
  // Lead capture fields (from form submissions)
  lead_name: z.string().max(255).nullable().optional(),
  lead_email: z.string().max(255).nullable().optional(),
  lead_phone: z.string().max(100).nullable().optional(),
  lead_company: z.string().max(255).nullable().optional(),
  lead_message: z.string().max(5000).nullable().optional(),
  lead_data: z.record(z.string(), z.string().max(500)).nullable().optional(),
  ecommerce_action: z.enum([
    'view_item', 'add_to_cart', 'remove_from_cart',
    'begin_checkout', 'purchase', 'refund',
  ]).nullable().optional(),
  order_id: z.string().max(255).nullable().optional(),
  revenue: z.number().nullable().optional(),
  currency: z.string().max(3).nullable().optional(),
  ecommerce_items: z.any().nullable().optional(),
  error_message: z.string().max(2000).nullable().optional(),
  error_stack: z.string().max(2000).nullable().optional(),
  error_source: z.string().max(2048).nullable().optional(),
  error_line: z.number().int().nullable().optional(),
  error_col: z.number().int().nullable().optional(),
});

export type CollectPayload = z.infer<typeof collectPayloadSchema>;

export const siteSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  timezone: z.string().max(100).default('UTC'),
  logo_url: z.string().url().nullable().optional(),
  brand_color: z.string().max(20).optional(),
  public: z.boolean().default(false),
  allowed_origins: z.array(z.string()).default([]),
});

export const goalSchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  goal_type: z.enum([
    'page_visit', 'event', 'form_submit', 'scroll_depth',
    'time_on_page', 'click', 'revenue', 'multi_condition', 'sequential',
  ]),
  conditions: z.any(),
  revenue_value: z.number().nullable().optional(),
  use_dynamic_revenue: z.boolean().default(false),
  count_mode: z.enum(['once_per_session', 'every_time']).default('once_per_session'),
  notify_webhook: z.string().url().nullable().optional(),
  notify_email: z.array(z.string().email()).nullable().optional(),
  notify_slack_webhook: z.string().url().nullable().optional(),
});

export const funnelSchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  steps: z.array(z.object({
    name: z.string(),
    type: z.string(),
    match: z.string().optional(),
    value: z.string().optional(),
    event_name: z.string().optional(),
    form_id: z.string().optional(),
  })).min(2),
  window_hours: z.number().int().min(1).default(168),
});

export const sharedReportSchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  brand_color: z.string().max(20).optional(),
  template: z.enum(['overview', 'seo', 'campaign', 'ecommerce', 'custom']).default('overview'),
  visible_sections: z.array(z.string()).optional(),
  hidden_metrics: z.array(z.string()).optional(),
  date_range_mode: z.enum([
    'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days',
    'this_month', 'last_month', 'custom', 'rolling',
  ]).default('last_30_days'),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  email_recipients: z.array(z.string().email()).nullable().optional(),
  email_schedule: z.enum(['weekly', 'monthly']).nullable().optional(),
  allow_embed: z.boolean().default(false),
});

export const alertSchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum([
    'traffic_drop', 'traffic_spike', 'goal_not_met', 'error_spike', 'uptime',
  ]),
  threshold: z.number(),
  notify_email: z.string().email(),
  notify_slack_url: z.string().url().nullable().optional(),
});

export const annotationSchema = z.object({
  site_id: z.string().uuid(),
  date: z.string(),
  text: z.string().min(1).max(500),
  color: z.string().max(20).default('#6366f1'),
});

export const memberInviteSchema = z.object({
  site_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'viewer', 'client']).default('viewer'),
});

export const apiKeySchema = z.object({
  site_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default(['read:stats']),
});
