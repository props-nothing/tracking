# 📊 Tracking — Self-Hosted Web Analytics

A lightweight, privacy-friendly alternative to Matomo and Google Analytics 4. Track visitors across multiple websites with a single embeddable script and monitor everything from a unified dashboard.

Built with **Next.js** (dashboard + API routes), **Supabase** (PostgreSQL + real-time), and a **vanilla JavaScript** tracking snippet (< 3 KB gzipped).

---

## Features

### Tracking Script
- **Ultra-lightweight** — Vanilla JavaScript, < 3 KB gzipped, zero dependencies
- **No cookies** — Uses anonymous session fingerprinting (screen resolution + language + timezone hash)
- **Automatic page view tracking** — Captures full page loads and SPA navigation (`pushState` / `popstate`)
- **Referrer & UTM parsing** — Extracts `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` from URL params
- **Performance metrics** — Collects `TTFB`, `FCP`, `LCP`, `CLS`, `INP`, `FID` via the Performance API
- **Scroll depth** — Records max scroll percentage on page unload
- **Outbound link tracking** — Automatically detects and logs clicks to external domains
- **Form tracking** — Automatic detection of all form submissions with field metadata, form abandonment, field interaction time, and error tracking
- **File download tracking** — Detects clicks on `.pdf`, `.zip`, `.docx`, `.xlsx`, `.csv`, `.mp4`, `.mp3` links
- **Rage click detection** — Identifies frustrated users clicking the same area 3+ times within 1 second
- **Dead click detection** — Logs clicks on non-interactive elements that produce no response
- **Element visibility tracking** — `data-track-visibility="section-name"` attribute triggers events when elements enter the viewport (IntersectionObserver)
- **Copy/paste tracking** — Detects clipboard copy events with selected text length and source element
- **Print tracking** — Fires event on `window.print()` / `Ctrl+P`
- **Tab visibility** — Tracks time spent on active vs background tab via Page Visibility API, reports engaged time
- **Error tracking** — Captures `window.onerror` and `unhandledrejection` with stack traces
- **Custom event API** — `window.tracking.event("signup", { plan: "pro" })` for manual instrumentation
- **Custom properties** — `window.tracking.set({ user_type: "premium", company: "Acme" })` persists session-level properties sent with every event
- **E-commerce tracking** — `window.tracking.ecommerce("purchase", { order_id: "123", total: 99.99, currency: "EUR", items: [...] })`
- **Bot filtering** — Ignores known bot user agents on the client side
- **DNT / GPC respect** — Optionally honors Do Not Track and Global Privacy Control headers
- **Beacon API** — Uses `navigator.sendBeacon()` for reliable data delivery on page unload
- **Consent mode** — `window.tracking.consent(true|false)` to dynamically enable/disable tracking
- **Debug mode** — `data-debug="true"` on the script tag logs all events to the browser console

### Goals & Conversions
- **Page visit goals** — Trigger when a visitor views a specific URL/path (exact match, contains, regex)
- **Event goals** — Trigger when a specific custom event fires (e.g., `signup`, `purchase`, `form_submit`)
- **Revenue goals** — Attach monetary value to conversions for ROI tracking
- **Multi-condition goals** — AND/OR conditions: "visited /pricing AND submitted contact form"
- **Sequential goals** — Must happen in order: "viewed product → added to cart → completed checkout"
- **Time-on-page goals** — Trigger when a visitor spends more than X seconds on a page
- **Scroll depth goals** — Trigger when a visitor scrolls past X% of a page
- **Recurring vs one-time** — Goal counts once per session or every time
- **Goal attribution** — Full attribution chain: which referrer/UTM/landing page led to conversion
- **Goal notifications** — Webhook, email, or Slack notification when a goal is achieved

### Form Analytics
- **Auto-detected forms** — Script automatically finds all `<form>` elements, no manual setup
- **Submission tracking** — Captures form ID, action URL, method, and all non-sensitive field names
- **Field interaction tracking** — Time spent per field, focus/blur order, tab sequence
- **Form abandonment** — Detects when a user starts filling a form but leaves without submitting
- **Last field before abandon** — Identifies the exact field where users drop off
- **Field error tracking** — Captures HTML5 validation errors and custom validation messages
- **Sensitive field filtering** — Automatically excludes `type="password"`, `type="hidden"`, fields with `data-no-track`, and fields named `credit_card`, `ssn`, `cvv`, etc.
- **Conversion rate per form** — Sessions that saw the form vs sessions that submitted it
- **Repeat submissions** — Tracks multiple submissions of the same form in a session

### Dashboard
- **Real-time active visitors** — Powered by Supabase Realtime subscriptions with live page they're viewing
- **Date range picker** — Today, yesterday, last 7/30/90/365 days, this month, last month, custom range, comparison periods
- **Multi-site switcher** — Add unlimited sites, each with a unique site ID
- **Core metrics cards** — Page views, unique visitors, sessions, avg. session duration, bounce rate, views per session, engaged time
- **Breakdown tables** — Top pages, entry pages, exit pages, referrers, UTM campaigns, countries, cities, browsers, OS, device types, screen sizes
- **Time-series charts** — Visitors and page views over time (hourly / daily / weekly / monthly granularity)
- **Funnel analysis** — Define multi-step funnels from custom events with conversion rates between each step
- **Goal dashboard** — Conversion rates, goal completions over time, goal value (revenue), attribution breakdown
- **Form analytics dashboard** — Submission rates, abandonment rates, field-level drop-off funnel, avg. time to complete
- **User flow / path analysis** — Sankey diagram showing the most common navigation paths through your site
- **Retention / cohort analysis** — Returning visitors by week/month cohort
- **Data export** — CSV and JSON export for any report
- **Authentication** — Email/password auth via Supabase Auth, with row-level security per site
- **Dark mode** — System-preference-aware with manual toggle
- **Fully responsive** — Mobile-first design using Tailwind CSS + shadcn/ui
- **Annotations** — Add notes to specific dates (e.g., "launched new pricing page") that appear on charts
- **Alerts** — Configurable alerts: traffic drops > 30%, goal not met for X days, sudden traffic spike

### Client Reporting & Shared Access
- **Shared report links** — Generate a public read-only URL per site (no login required), protected by a unique token
- **Password-protected reports** — Optionally add a password to shared report links
- **Branded reports** — Upload client logo, set custom colors, add a report title/description
- **Report templates** — Pre-built templates: "SEO Report", "Campaign Report", "Monthly Overview", "E-commerce Report"
- **Scheduled email reports** — Weekly or monthly PDF/HTML digest sent to a list of email addresses per site
- **Client user accounts** — Invite clients with read-only access scoped to specific sites, separate from admin accounts
- **Role-based access** — `owner` (full access), `admin` (manage sites), `viewer` (read-only dashboard), `client` (scoped read-only with branding)
- **Report sections** — Toggle which sections are visible per shared report (e.g., hide revenue data from SEO agency)
- **White-label mode** — Custom domain support, remove "Tracking" branding, use your own logo globally
- **PDF export** — One-click PDF generation of the current dashboard view
- **API access for clients** — Read-only API keys scoped to specific sites for programmatic data access
- **Embed widget** — `<iframe>` embeddable mini-dashboard for client portals

---

## Architecture

```
┌──────────────────┐        ┌─────────────────────────────────────┐
│  Your Website(s) │        │  Next.js App (Vercel / VPS)         │
│                  │        │                                     │
│  <script t.js>   │──POST─▶│  /api/collect       (ingest)       │
│                  │        │  /api/sites         (CRUD)          │
│                  │        │  /api/stats         (aggregations)  │
│                  │        │  /api/goals         (CRUD + eval)   │
│                  │        │  /api/forms         (form analytics) │
│                  │        │  /api/reports       (shared reports) │
│                  │        │  /api/export        (CSV/JSON/PDF)  │
│                  │        │  /api/auth          (Supabase Auth) │
│                  │        │  /api/webhooks      (notifications) │
│                  │        │                                     │
│                  │        │  /dashboard         (admin UI)      │
│                  │        │  /report/[token]    (client report) │
└──────────────────┘        └──────────┬──────────────────────────┘
                                       │
                            ┌──────────▼──────────────┐
                            │  Supabase                │
                            │                          │
                            │  ├─ PostgreSQL (storage)  │
                            │  ├─ Realtime (live data)  │
                            │  ├─ Auth (dashboard auth) │
                            │  ├─ Storage (logos, PDFs)  │
                            │  └─ Edge Functions (opt.) │
                            └──────────────────────────┘
```

---

## Tech Stack

| Component          | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Tracking script    | Vanilla JavaScript (< 3 KB gzipped)                    |
| API / Server       | Next.js 14 API Routes (App Router, Route Handlers)      |
| Database           | Supabase (PostgreSQL 15 + pgcrypto + pg_trgm)          |
| Real-time          | Supabase Realtime (WebSocket subscriptions)             |
| Authentication     | Supabase Auth (email/password, magic link, OAuth)       |
| File storage       | Supabase Storage (client logos, PDF reports)             |
| Dashboard UI       | Next.js 14 + React 18 + Tailwind CSS + shadcn/ui       |
| Charts             | Recharts                                                |
| Sankey diagrams    | d3-sankey (user flow visualization)                     |
| PDF generation     | @react-pdf/renderer (server-side PDF reports)           |
| Email delivery     | Resend (scheduled reports + goal notifications)         |
| Geo-location       | MaxMind GeoLite2 (local DB, no third-party API calls)   |
| Bot detection      | isbot (npm package) + custom UA filter                  |
| Rate limiting      | upstash/ratelimit (Redis-backed, per IP)                |
| Cron / scheduling  | Vercel Cron or node-cron (materialized view refresh, email reports, salt rotation) |
| Deployment         | Vercel (or Docker on any VPS)                           |
| Package manager    | pnpm                                                    |

---

## Database Schema (Supabase / PostgreSQL)

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================
-- SITES
-- ============================================================
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text not null unique,
  timezone text not null default 'UTC',
  -- White-label / branding
  logo_url text,
  brand_color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sites enable row level security;
create policy "Users can manage their own sites"
  on public.sites for all using (auth.uid() = user_id);

-- ============================================================
-- SITE MEMBERS (multi-user access + client access)
-- ============================================================
create table public.site_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'viewer', 'client')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique (site_id, user_id)
);

alter table public.site_members enable row level security;
create policy "Members can see their own memberships"
  on public.site_members for select using (auth.uid() = user_id);
create policy "Owners and admins can manage members"
  on public.site_members for all using (
    site_id in (
      select site_id from public.site_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- EVENTS (main analytics table)
-- ============================================================
create table public.events (
  id bigint generated always as identity primary key,
  site_id uuid references public.sites(id) on delete cascade not null,

  -- Event classification
  event_type text not null default 'pageview'
    check (event_type in ('pageview', 'custom', 'form_submit', 'form_abandon',
                          'outbound_click', 'file_download', 'scroll_depth',
                          'rage_click', 'dead_click', 'element_visible',
                          'copy', 'print', 'error', 'ecommerce')),
  event_name text,           -- e.g. "signup", "purchase", "contact_form"
  event_data jsonb default '{}',

  -- Page
  url text not null,
  path text not null,
  hostname text not null,
  page_title text,

  -- Referrer
  referrer text,
  referrer_hostname text,

  -- UTM
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,

  -- Visitor (anonymous)
  visitor_hash text not null,
  session_id uuid not null,

  -- Session-level custom properties (set via window.tracking.set())
  custom_props jsonb default '{}',

  -- Device
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_type text check (device_type in ('desktop', 'mobile', 'tablet')),
  screen_width int,
  screen_height int,
  viewport_width int,
  viewport_height int,
  language text,
  timezone text,
  connection_type text,      -- 'slow-2g' | '2g' | '3g' | '4g'

  -- Geo (server-side via MaxMind)
  country_code char(2),
  country_name text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,

  -- Performance
  ttfb_ms int,
  fcp_ms int,
  lcp_ms int,
  cls double precision,
  inp_ms int,
  fid_ms int,

  -- Engagement
  scroll_depth_pct smallint,
  time_on_page_ms int,
  engaged_time_ms int,       -- only active/visible tab time

  -- Form tracking
  form_id text,              -- form element id or auto-generated
  form_action text,          -- form action URL
  form_fields jsonb,         -- [{ name, type, filled, time_ms, had_error }]
  form_last_field text,      -- last field interacted with (for abandonment analysis)
  form_time_to_submit_ms int,

  -- E-commerce
  ecommerce_action text check (ecommerce_action in (
    'view_item', 'add_to_cart', 'remove_from_cart',
    'begin_checkout', 'purchase', 'refund'
  )),
  order_id text,
  revenue decimal(10,2),
  currency char(3) default 'EUR',
  ecommerce_items jsonb,     -- [{ id, name, category, price, quantity }]

  -- Error tracking
  error_message text,
  error_stack text,
  error_source text,         -- file URL
  error_line int,
  error_col int,

  -- Entry / exit tracking
  is_entry boolean default false,
  is_exit boolean default false,
  is_bounce boolean default false,

  -- Meta
  timestamp timestamptz default now()
);

alter table public.events enable row level security;

create policy "Users can read events for their own sites"
  on public.events for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can insert events"
  on public.events for insert with check (true);

-- Indexes
create index idx_events_site_ts on public.events (site_id, timestamp desc);
create index idx_events_site_path on public.events (site_id, path);
create index idx_events_site_type on public.events (site_id, event_type);
create index idx_events_visitor on public.events (site_id, visitor_hash, timestamp desc);
create index idx_events_session on public.events (session_id);
create index idx_events_country on public.events (site_id, country_code);
create index idx_events_referrer on public.events (site_id, referrer_hostname);
create index idx_events_form on public.events (site_id, form_id) where form_id is not null;
create index idx_events_ecommerce on public.events (site_id, ecommerce_action) where ecommerce_action is not null;
create index idx_events_event_name on public.events (site_id, event_name) where event_name is not null;
create index idx_events_entry on public.events (site_id, timestamp desc) where is_entry = true;
create index idx_events_custom_props on public.events using gin (custom_props) where custom_props != '{}';

-- Partitioning hint: for high-volume production, partition by month
-- create table public.events (...) partition by range (timestamp);

-- ============================================================
-- SESSIONS (aggregated per session for fast queries)
-- ============================================================
create table public.sessions (
  id uuid primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  visitor_hash text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_ms int,
  engaged_time_ms int,
  pageviews int default 1,
  events_count int default 1,
  is_bounce boolean default true,
  entry_path text,
  exit_path text,
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country_code char(2),
  city text,
  device_type text,
  browser text,
  os text,
  -- Revenue attributed to this session
  total_revenue decimal(10,2) default 0,
  -- Custom properties snapshot
  custom_props jsonb default '{}'
);

alter table public.sessions enable row level security;
create policy "Users can read sessions for their own sites"
  on public.sessions for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can manage sessions"
  on public.sessions for all with check (true);

create index idx_sessions_site_started on public.sessions (site_id, started_at desc);
create index idx_sessions_visitor on public.sessions (site_id, visitor_hash);
create index idx_sessions_bounce on public.sessions (site_id, is_bounce) where is_bounce = true;
create index idx_sessions_revenue on public.sessions (site_id, total_revenue) where total_revenue > 0;

-- ============================================================
-- GOALS
-- ============================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  active boolean default true,

  -- Goal type
  goal_type text not null check (goal_type in (
    'page_visit',       -- visitor views a specific page
    'event',            -- a specific custom event fires
    'form_submit',      -- a specific form is submitted
    'scroll_depth',     -- visitor scrolls past X%
    'time_on_page',     -- visitor spends X+ seconds on a page
    'click',            -- visitor clicks element matching selector
    'revenue',          -- any purchase event
    'multi_condition',  -- AND/OR of multiple sub-conditions
    'sequential'        -- conditions must happen in order within a session
  )),

  -- Conditions (JSON-based for flexibility)
  conditions jsonb not null default '[]',
  /*
    Examples:
    
    Page visit:
    [{ "type": "page_visit", "match": "contains", "value": "/pricing" }]

    Event:
    [{ "type": "event", "event_name": "signup", "property": "plan", "operator": "equals", "value": "pro" }]

    Form submit:
    [{ "type": "form_submit", "form_id": "contact-form" }]

    Scroll depth:
    [{ "type": "scroll_depth", "path": "/blog/*", "min_pct": 75 }]

    Time on page:
    [{ "type": "time_on_page", "path": "/pricing", "min_seconds": 30 }]

    Multi-condition (AND):
    {
      "operator": "AND",
      "conditions": [
        { "type": "page_visit", "match": "exact", "value": "/pricing" },
        { "type": "form_submit", "form_id": "demo-request" }
      ]
    }

    Sequential:
    {
      "operator": "SEQUENCE",
      "conditions": [
        { "type": "page_visit", "match": "contains", "value": "/products" },
        { "type": "event", "event_name": "add_to_cart" },
        { "type": "event", "event_name": "purchase" }
      ]
    }
  */

  -- Value
  revenue_value decimal(10,2),         -- fixed value per conversion (optional)
  use_dynamic_revenue boolean default false, -- use actual purchase revenue from event

  -- Counting
  count_mode text default 'once_per_session' check (count_mode in ('once_per_session', 'every_time')),

  -- Notifications
  notify_webhook text,                 -- POST to this URL on conversion
  notify_email text[],                 -- email addresses to notify
  notify_slack_webhook text,           -- Slack incoming webhook URL

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goals enable row level security;
create policy "Users can manage goals for their own sites"
  on public.goals for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- GOAL CONVERSIONS (log of each conversion)
-- ============================================================
create table public.goal_conversions (
  id bigint generated always as identity primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  site_id uuid references public.sites(id) on delete cascade not null,
  session_id uuid not null,
  visitor_hash text not null,
  event_id bigint references public.events(id) on delete set null,

  -- Attribution
  referrer_hostname text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  entry_path text,
  conversion_path text,        -- the page where conversion happened

  -- Value
  revenue decimal(10,2),

  converted_at timestamptz default now()
);

alter table public.goal_conversions enable row level security;
create policy "Users can read goal conversions for their own sites"
  on public.goal_conversions for select using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );
create policy "Service role can insert conversions"
  on public.goal_conversions for insert with check (true);

create index idx_conversions_goal on public.goal_conversions (goal_id, converted_at desc);
create index idx_conversions_site on public.goal_conversions (site_id, converted_at desc);
create index idx_conversions_session on public.goal_conversions (session_id);

-- ============================================================
-- FUNNELS
-- ============================================================
create table public.funnels (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  name text not null,
  description text,
  -- Ordered array of steps
  steps jsonb not null default '[]',
  /*
    [
      { "name": "Visit pricing", "type": "page_visit", "match": "contains", "value": "/pricing" },
      { "name": "Click signup", "type": "event", "event_name": "signup_click" },
      { "name": "Submit form", "type": "form_submit", "form_id": "signup-form" },
      { "name": "Purchase", "type": "event", "event_name": "purchase" }
    ]
  */
  -- Time window: sessions must complete funnel within this duration
  window_hours int default 168, -- 7 days
  created_at timestamptz default now()
);

alter table public.funnels enable row level security;
create policy "Users can manage funnels for their own sites"
  on public.funnels for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- SHARED REPORTS (client-facing)
-- ============================================================
create table public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,

  -- Access
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  password_hash text,               -- bcrypt hash, null = no password
  expires_at timestamptz,           -- null = never expires

  -- Branding
  title text,                       -- e.g., "Monthly Report — Acme Corp"
  description text,
  logo_url text,                    -- client-specific logo (overrides site logo)
  brand_color text,

  -- Content control
  template text default 'overview' check (template in (
    'overview', 'seo', 'campaign', 'ecommerce', 'custom'
  )),
  visible_sections text[] default array[
    'metrics', 'chart', 'pages', 'referrers', 'countries',
    'devices', 'utm', 'goals', 'forms'
  ],
  hidden_metrics text[] default '{}', -- e.g., ['revenue', 'bounce_rate']

  -- Date range
  date_range_mode text default 'last_30_days' check (date_range_mode in (
    'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days',
    'this_month', 'last_month', 'custom', 'rolling'
  )),
  date_from date,
  date_to date,

  -- Scheduling
  email_recipients text[],          -- email addresses for scheduled delivery
  email_schedule text check (email_schedule in ('weekly', 'monthly', null)),
  email_last_sent_at timestamptz,

  -- Embed
  allow_embed boolean default false, -- allow <iframe> embedding

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shared_reports enable row level security;
create policy "Users can manage shared reports for their own sites"
  on public.shared_reports for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- API KEYS (for programmatic client access)
-- ============================================================
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,                -- e.g., "Acme Corp read-only"
  key_hash text not null unique,     -- SHA-256 of the actual key (never store plaintext)
  key_prefix text not null,          -- first 8 chars for identification: "tk_live_a1b2c3d4..."
  permissions text[] default array['read'],  -- 'read' | 'write'
  scoped_to_site boolean default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.api_keys enable row level security;
create policy "Users can manage API keys for their own sites"
  on public.api_keys for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- ANNOTATIONS (chart notes)
-- ============================================================
create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  date date not null,
  text text not null,
  color text default '#6366f1',
  created_at timestamptz default now()
);

alter table public.annotations enable row level security;
create policy "Users can manage annotations for their own sites"
  on public.annotations for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid()
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- ALERTS
-- ============================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  created_by uuid references auth.users(id) not null,
  name text not null,
  active boolean default true,
  alert_type text not null check (alert_type in (
    'traffic_drop',      -- visitors drop > X% vs previous period
    'traffic_spike',     -- visitors increase > X% vs previous period
    'goal_not_met',      -- goal has 0 conversions for X days
    'error_spike',       -- JS errors increase > X% or exceed threshold
    'uptime'             -- no events received for X minutes (site down?)
  )),
  threshold jsonb not null, -- { "pct": 30, "period": "day" } or { "days": 3 }
  notify_email text[],
  notify_slack_webhook text,
  notify_webhook text,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;
create policy "Users can manage alerts for their own sites"
  on public.alerts for all using (
    site_id in (
      select site_id from public.site_members where user_id = auth.uid() and role in ('owner', 'admin')
      union
      select id from public.sites where user_id = auth.uid()
    )
  );

-- ============================================================
-- MATERIALIZED VIEWS
-- ============================================================

-- Active visitors (last 5 minutes)
create or replace view public.active_visitors as
select
  site_id,
  count(distinct visitor_hash) as active_count,
  jsonb_agg(distinct jsonb_build_object('path', path, 'visitor', visitor_hash)) as active_pages
from public.events
where timestamp > now() - interval '5 minutes'
  and event_type = 'pageview'
group by site_id;

-- Daily stats (materialized, refreshed by cron)
create materialized view public.daily_stats as
select
  site_id,
  date_trunc('day', timestamp)::date as day,
  count(*) filter (where event_type = 'pageview') as pageviews,
  count(distinct visitor_hash) as unique_visitors,
  count(distinct session_id) as sessions,
  count(distinct path) as unique_pages,
  count(*) filter (where event_type = 'form_submit') as form_submissions,
  sum(revenue) filter (where revenue is not null) as total_revenue,
  avg(engaged_time_ms) filter (where engaged_time_ms is not null) as avg_engaged_time_ms
from public.events
group by site_id, date_trunc('day', timestamp)::date;

create unique index idx_daily_stats_site_day on public.daily_stats (site_id, day);

-- Hourly stats (for real-time "today" view)
create materialized view public.hourly_stats as
select
  site_id,
  date_trunc('hour', timestamp) as hour,
  count(*) filter (where event_type = 'pageview') as pageviews,
  count(distinct visitor_hash) as unique_visitors,
  count(distinct session_id) as sessions
from public.events
where timestamp > now() - interval '48 hours'
group by site_id, date_trunc('hour', timestamp);

create unique index idx_hourly_stats_site_hour on public.hourly_stats (site_id, hour);

-- Goal conversion daily summary
create materialized view public.daily_goal_stats as
select
  gc.goal_id,
  gc.site_id,
  date_trunc('day', gc.converted_at)::date as day,
  count(*) as conversions,
  count(distinct gc.visitor_hash) as unique_converters,
  sum(gc.revenue) as revenue
from public.goal_conversions gc
group by gc.goal_id, gc.site_id, date_trunc('day', gc.converted_at)::date;

create unique index idx_daily_goal_stats on public.daily_goal_stats (goal_id, site_id, day);

-- Form analytics summary
create materialized view public.form_stats as
select
  site_id,
  form_id,
  count(*) filter (where event_type = 'form_submit') as submissions,
  count(*) filter (where event_type = 'form_abandon') as abandonments,
  round(
    count(*) filter (where event_type = 'form_submit')::decimal /
    nullif(count(*) filter (where event_type in ('form_submit', 'form_abandon')), 0) * 100,
    1
  ) as completion_rate_pct,
  avg(form_time_to_submit_ms) filter (where event_type = 'form_submit') as avg_time_to_submit_ms,
  mode() within group (order by form_last_field) filter (where event_type = 'form_abandon') as most_common_abandon_field
from public.events
where form_id is not null
group by site_id, form_id;

create unique index idx_form_stats on public.form_stats (site_id, form_id);

-- Refresh function (called by cron)
create or replace function public.refresh_materialized_views()
returns void as $$
begin
  refresh materialized view concurrently public.daily_stats;
  refresh materialized view concurrently public.hourly_stats;
  refresh materialized view concurrently public.daily_goal_stats;
  refresh materialized view concurrently public.form_stats;
end;
$$ language plpgsql security definer;

-- Schedule: run every 5 minutes via pg_cron (or external cron)
-- select cron.schedule('refresh-views', '*/5 * * * *', 'select public.refresh_materialized_views()');
```

---

## Project Structure

```
tracking/
├── apps/
│   └── web/                              # Next.js 14 app
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   └── forgot-password/page.tsx
│       │   ├── (marketing)/
│       │   │   ├── page.tsx              # Landing page
│       │   │   ├── pricing/page.tsx
│       │   │   └── docs/page.tsx
│       │   ├── dashboard/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx              # Overview across all sites
│       │   │   └── [siteId]/
│       │   │       ├── page.tsx          # Per-site analytics overview
│       │   │       ├── realtime/page.tsx  # Live visitors
│       │   │       ├── pages/page.tsx     # Top pages, entry, exit pages
│       │   │       ├── referrers/page.tsx # Referrer & UTM breakdown
│       │   │       ├── geo/page.tsx       # Countries, cities, map
│       │   │       ├── devices/page.tsx   # Browsers, OS, screen sizes
│       │   │       ├── events/page.tsx    # Custom events log
│       │   │       ├── goals/
│       │   │       │   ├── page.tsx       # Goals overview + conversion rates
│       │   │       │   ├── new/page.tsx   # Create goal wizard
│       │   │       │   └── [goalId]/page.tsx # Goal detail + attribution
│       │   │       ├── funnels/
│       │   │       │   ├── page.tsx       # Funnels list
│       │   │       │   ├── new/page.tsx   # Create funnel
│       │   │       │   └── [funnelId]/page.tsx # Funnel visualization
│       │   │       ├── forms/page.tsx     # Form analytics
│       │   │       ├── flow/page.tsx      # User flow / path analysis (Sankey)
│       │   │       ├── retention/page.tsx # Cohort retention matrix
│       │   │       ├── ecommerce/page.tsx # Revenue, orders, products
│       │   │       ├── errors/page.tsx    # JS error log
│       │   │       ├── reports/
│       │   │       │   ├── page.tsx       # Manage shared reports
│       │   │       │   └── new/page.tsx   # Create shared report
│       │   │       ├── alerts/page.tsx    # Manage alerts
│       │   │       ├── annotations/page.tsx
│       │   │       ├── api-keys/page.tsx  # Manage API keys
│       │   │       ├── team/page.tsx      # Invite members / clients
│       │   │       └── settings/page.tsx  # Site settings, tracking code, branding
│       │   ├── report/
│       │   │   └── [token]/page.tsx       # Public shared report (no auth required)
│       │   ├── embed/
│       │   │   └── [token]/page.tsx       # Embeddable mini-dashboard
│       │   ├── api/
│       │   │   ├── collect/route.ts       # POST — event ingest (public, CORS)
│       │   │   ├── sessions/route.ts      # Session upsert (internal)
│       │   │   ├── sites/
│       │   │   │   ├── route.ts           # GET (list) / POST (create)
│       │   │   │   └── [id]/route.ts      # PATCH / DELETE
│       │   │   ├── stats/route.ts         # Aggregated queries
│       │   │   ├── goals/
│       │   │   │   ├── route.ts           # CRUD
│       │   │   │   ├── [id]/route.ts
│       │   │   │   └── evaluate/route.ts  # Real-time goal evaluation
│       │   │   ├── funnels/
│       │   │   │   ├── route.ts
│       │   │   │   └── [id]/
│       │   │   │       ├── route.ts
│       │   │   │       └── stats/route.ts # Compute funnel conversion rates
│       │   │   ├── forms/route.ts         # Form analytics queries
│       │   │   ├── reports/
│       │   │   │   ├── route.ts           # CRUD shared reports
│       │   │   │   ├── [id]/route.ts
│       │   │   │   └── [token]/
│       │   │   │       ├── data/route.ts  # Public data endpoint for shared report
│       │   │   │       └── pdf/route.ts   # Generate PDF
│       │   │   ├── export/route.ts        # CSV / JSON export
│       │   │   ├── members/route.ts       # Invite / manage team members
│       │   │   ├── api-keys/route.ts      # CRUD API keys
│       │   │   ├── alerts/route.ts        # CRUD alerts
│       │   │   ├── annotations/route.ts   # CRUD annotations
│       │   │   ├── webhooks/route.ts      # Outbound webhook dispatcher
│       │   │   ├── cron/
│       │   │   │   ├── refresh-views/route.ts  # Materialized view refresh
│       │   │   │   ├── rotate-salt/route.ts    # Daily salt rotation
│       │   │   │   ├── send-reports/route.ts   # Scheduled email reports
│       │   │   │   └── check-alerts/route.ts   # Alert evaluation
│       │   │   └── auth/
│       │   │       ├── callback/route.ts
│       │   │       └── confirm/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ui/                        # shadcn/ui components
│       │   ├── charts/
│       │   │   ├── time-series.tsx
│       │   │   ├── bar-chart.tsx
│       │   │   ├── pie-chart.tsx
│       │   │   ├── funnel-chart.tsx
│       │   │   ├── sankey-flow.tsx         # User flow diagram
│       │   │   ├── retention-matrix.tsx
│       │   │   ├── world-map.tsx
│       │   │   └── sparkline.tsx
│       │   ├── tables/
│       │   │   ├── data-table.tsx          # Reusable sortable/filterable table
│       │   │   ├── top-pages.tsx
│       │   │   ├── top-referrers.tsx
│       │   │   ├── top-countries.tsx
│       │   │   ├── events-log.tsx
│       │   │   ├── form-fields-table.tsx
│       │   │   └── conversions-table.tsx
│       │   ├── goals/
│       │   │   ├── goal-wizard.tsx         # Multi-step goal creation
│       │   │   ├── condition-builder.tsx   # Visual AND/OR/SEQUENCE builder
│       │   │   └── goal-card.tsx
│       │   ├── reports/
│       │   │   ├── report-builder.tsx      # Configure shared report sections
│       │   │   ├── report-preview.tsx
│       │   │   └── report-public.tsx       # Public report renderer
│       │   ├── site-switcher.tsx
│       │   ├── date-range-picker.tsx
│       │   ├── comparison-toggle.tsx       # Compare to previous period
│       │   ├── metric-card.tsx
│       │   ├── active-visitors-badge.tsx
│       │   ├── annotation-marker.tsx
│       │   └── filter-bar.tsx              # Global filter: country, device, UTM, etc.
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── client.ts
│       │   │   ├── server.ts
│       │   │   └── middleware.ts
│       │   ├── geo.ts                     # MaxMind GeoLite2 lookup
│       │   ├── ua-parser.ts               # User-agent parsing
│       │   ├── bot-filter.ts              # Bot detection
│       │   ├── hash.ts                    # Visitor hash generation (daily salt)
│       │   ├── goals-engine.ts            # Goal evaluation logic
│       │   ├── funnel-engine.ts           # Funnel computation
│       │   ├── session-manager.ts         # Server-side session upsert
│       │   ├── rate-limiter.ts            # Upstash rate limiting
│       │   ├── pdf-generator.ts           # React-PDF report generation
│       │   ├── email.ts                   # Resend email wrapper
│       │   ├── webhooks.ts                # Outbound webhook sender
│       │   ├── validators.ts              # Zod schemas for API payloads
│       │   └── utils.ts
│       ├── hooks/
│       │   ├── use-realtime-visitors.ts
│       │   ├── use-date-range.ts
│       │   ├── use-stats.ts
│       │   └── use-site.ts
│       ├── public/
│       │   └── t.js                       # Compiled tracking script
│       ├── tailwind.config.ts
│       ├── next.config.mjs
│       └── package.json
├── packages/
│   └── tracker/                           # Tracking script source
│       ├── src/
│       │   ├── index.ts                   # Entry point
│       │   ├── config.ts                  # Read data-* attributes from script tag
│       │   ├── collect.ts                 # Beacon / fetch sender
│       │   ├── session.ts                 # Session ID management
│       │   ├── utm.ts                     # UTM parameter parser
│       │   ├── performance.ts             # Web Vitals (TTFB, FCP, LCP, CLS, INP, FID)
│       │   ├── scroll.ts                  # Scroll depth tracker
│       │   ├── engagement.ts              # Engaged time (Page Visibility API)
│       │   ├── outbound.ts                # Outbound link click handler
│       │   ├── downloads.ts               # File download detection
│       │   ├── forms.ts                   # Form submission + abandonment + field tracking
│       │   ├── spa.ts                     # SPA navigation detection
│       │   ├── visibility.ts              # Element visibility (IntersectionObserver)
│       │   ├── rage-click.ts              # Rage click detection
│       │   ├── dead-click.ts              # Dead click detection
│       │   ├── clipboard.ts               # Copy event tracking
│       │   ├── print.ts                   # Print event tracking
│       │   ├── errors.ts                  # JS error + unhandled rejection tracking
│       │   ├── ecommerce.ts               # E-commerce event helpers
│       │   ├── consent.ts                 # Consent mode toggle
│       │   ├── custom-props.ts            # Session-level custom properties
│       │   └── utils.ts                   # Bot check, DNT/GPC check, UUID generation
│       ├── rollup.config.mjs
│       ├── tsconfig.json
│       └── package.json
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_sessions_table.sql
│   │   ├── 003_goals_and_conversions.sql
│   │   ├── 004_shared_reports.sql
│   │   ├── 005_api_keys.sql
│   │   ├── 006_alerts_annotations.sql
│   │   └── 007_materialized_views.sql
│   ├── seed.sql
│   └── config.toml
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── readme.md
```

---

## Tracking Script Details

The compiled script (`t.js`) performs the following on load:

1. **Read configuration** from `<script>` tag attributes: `data-site-id`, `data-api`, `data-debug`, `data-respect-dnt`, `data-track-forms`, `data-track-outbound`, `data-track-downloads`, `data-track-errors`, `data-track-rage-clicks`
2. **Check consent** — if consent mode is enabled, wait for `window.tracking.consent(true)` before tracking
3. **Check DNT / GPC** — optionally stop if Do Not Track or Global Privacy Control is enabled
4. **Filter bots** — check user agent against known bot patterns
5. **Generate / retrieve session ID** from `sessionStorage` (rotates after 30 min idle)
6. **Collect page data**: URL, path, title, referrer, UTM params, screen size, viewport size, language, timezone, connection type
7. **Send `pageview` event** via `POST /api/collect` using `fetch`
8. **Collect Web Vitals** via `PerformanceObserver` (TTFB, FCP, LCP, CLS, INP, FID) and batch-send
9. **Listen for SPA navigations** (`pushState`, `replaceState`, `popstate`) and send new pageviews
10. **Track engaged time** via Page Visibility API (only counts time when tab is active)
11. **Track scroll depth** continuously, send max on `beforeunload` via `navigator.sendBeacon()`
12. **Intercept outbound link clicks** and fire events before navigation
13. **Detect file downloads** and fire events for tracked extensions
14. **Auto-track forms**: attach `submit` listeners to all `<form>` elements, track field interactions, detect abandonment on `beforeunload`
15. **Track element visibility** for elements with `data-track-visibility` attribute
16. **Detect rage clicks** (3+ clicks within 1 second on the same element)
17. **Detect dead clicks** (click on element that triggers no DOM change within 1 second)
18. **Track copy events** (clipboard copy with text length and source)
19. **Track print events**
20. **Capture JS errors** and unhandled promise rejections
21. **Expose public API**:
    - `window.tracking.event(name, data)` — custom event
    - `window.tracking.set(props)` — session-level custom properties
    - `window.tracking.ecommerce(action, data)` — e-commerce event
    - `window.tracking.consent(granted)` — consent toggle
    - `window.tracking.debug(enabled)` — toggle debug logging

### Visitor Anonymization

No cookies or persistent identifiers. The **server** generates a daily-rotating visitor hash:

```
visitor_hash = SHA-256(ip + user_agent + screen_resolution + language + timezone + daily_salt)
```

The `daily_salt` rotates at midnight UTC, making it impossible to track a visitor across days while still providing accurate daily unique counts.

### Sensitive Data Protection

The tracking script **never** collects:
- Form field **values** (only field names, types, and interaction metadata)
- Password fields, hidden fields, or fields marked with `data-no-track`
- Fields named `credit_card`, `card_number`, `cvv`, `ssn`, `password`, `secret`
- Text selected during copy events (only length is recorded)
- Full error stack traces from third-party scripts (only first-party domain errors)

---

## API Endpoints

| Method | Path                          | Auth         | Description                                      |
| ------ | ----------------------------- | ------------ | ------------------------------------------------ |
| POST   | `/api/collect`                | Public       | Ingest events (CORS-enabled, rate-limited)       |
| GET    | `/api/sites`                  | Required     | List user's sites                                |
| POST   | `/api/sites`                  | Required     | Create a new site                                |
| PATCH  | `/api/sites/:id`              | Required     | Update site settings                             |
| DELETE | `/api/sites/:id`              | Required     | Delete site and all data                         |
| GET    | `/api/stats`                  | Required     | Query aggregated analytics                       |
| GET    | `/api/goals`                  | Required     | List goals for a site                            |
| POST   | `/api/goals`                  | Required     | Create a goal                                    |
| PATCH  | `/api/goals/:id`              | Required     | Update a goal                                    |
| DELETE | `/api/goals/:id`              | Required     | Delete a goal                                    |
| GET    | `/api/funnels`                | Required     | List funnels                                     |
| POST   | `/api/funnels`                | Required     | Create a funnel                                  |
| GET    | `/api/funnels/:id/stats`      | Required     | Compute funnel conversion rates                  |
| GET    | `/api/forms`                  | Required     | Form analytics (submissions, abandonment, fields)|
| GET    | `/api/reports`                | Required     | List shared reports                              |
| POST   | `/api/reports`                | Required     | Create a shared report                           |
| PATCH  | `/api/reports/:id`            | Required     | Update shared report settings                    |
| DELETE | `/api/reports/:id`            | Required     | Delete shared report                             |
| GET    | `/api/reports/:token/data`    | Token/Public | Fetch data for shared report (respects password) |
| GET    | `/api/reports/:token/pdf`     | Token/Public | Generate PDF for shared report                   |
| GET    | `/api/export`                 | Required     | Export data as CSV or JSON                       |
| POST   | `/api/members`                | Required     | Invite team member / client                      |
| DELETE | `/api/members/:id`            | Required     | Remove team member                               |
| POST   | `/api/api-keys`               | Required     | Create API key                                   |
| DELETE | `/api/api-keys/:id`           | Required     | Revoke API key                                   |
| GET    | `/api/alerts`                 | Required     | List alerts                                      |
| POST   | `/api/alerts`                 | Required     | Create alert                                     |
| POST   | `/api/annotations`            | Required     | Add annotation                                   |
| GET    | `/api/cron/refresh-views`     | Cron secret  | Refresh materialized views                       |
| GET    | `/api/cron/rotate-salt`       | Cron secret  | Rotate daily visitor hash salt                   |
| GET    | `/api/cron/send-reports`      | Cron secret  | Send scheduled email reports                     |
| GET    | `/api/cron/check-alerts`      | Cron secret  | Evaluate alert conditions                        |

### POST `/api/collect` — Payload

```json
{
  "site_id": "uuid",
  "url": "https://example.com/pricing",
  "path": "/pricing",
  "hostname": "example.com",
  "page_title": "Pricing — Example",
  "referrer": "https://google.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "spring_sale",
  "utm_term": null,
  "utm_content": null,
  "screen_width": 1920,
  "screen_height": 1080,
  "viewport_width": 1440,
  "viewport_height": 900,
  "language": "en-US",
  "timezone": "America/New_York",
  "connection_type": "4g",
  "event_type": "pageview",
  "event_name": null,
  "event_data": {},
  "custom_props": { "user_type": "premium" },
  "session_id": "uuid",
  "scroll_depth_pct": null,
  "engaged_time_ms": 12400,
  "ttfb_ms": 120,
  "fcp_ms": 450,
  "lcp_ms": 1200,
  "cls": 0.05,
  "inp_ms": 80,
  "fid_ms": 12,
  "form_id": null,
  "form_action": null,
  "form_fields": null,
  "form_last_field": null,
  "form_time_to_submit_ms": null,
  "ecommerce_action": null,
  "order_id": null,
  "revenue": null,
  "currency": null,
  "ecommerce_items": null,
  "error_message": null,
  "error_stack": null,
  "error_source": null,
  "error_line": null,
  "error_col": null
}
```

Server-side processing:
1. **Validate payload** via Zod schema (reject malformed data)
2. **Validate `site_id`** exists and domain matches `Origin` header
3. **Rate limit** by IP (100 events / minute) via Upstash Redis
4. **Filter bots** via `isbot` + custom UA list
5. **Parse user-agent** → browser, browser version, OS, OS version, device type
6. **Geo-locate IP** via MaxMind GeoLite2 local database → country, region, city, lat/lng
7. **Generate `visitor_hash`** with daily-rotating salt
8. **Determine entry/exit/bounce** by checking session state
9. **Insert row into `public.events`**
10. **Upsert `public.sessions`** (update duration, pageview count, exit path, etc.)
11. **Evaluate goals** — check all active goals for the site, insert into `goal_conversions` if matched, fire notifications
12. **Return `202 Accepted`** (empty body, < 1ms perceived latency)

---

## Goal Configuration Examples

### 1. Page Visit Goal
> Trigger when a visitor views the pricing page

```json
{
  "name": "Viewed Pricing Page",
  "goal_type": "page_visit",
  "conditions": [
    { "type": "page_visit", "match": "exact", "value": "/pricing" }
  ],
  "count_mode": "once_per_session"
}
```

### 2. Event Goal with Property Filter
> Trigger when a user signs up for the Pro plan

```json
{
  "name": "Pro Signup",
  "goal_type": "event",
  "conditions": [
    {
      "type": "event",
      "event_name": "signup",
      "property": "plan",
      "operator": "equals",
      "value": "pro"
    }
  ],
  "revenue_value": 49.99,
  "count_mode": "once_per_session"
}
```

### 3. Form Submission Goal
> Trigger when the contact form is submitted

```json
{
  "name": "Contact Form Submitted",
  "goal_type": "form_submit",
  "conditions": [
    { "type": "form_submit", "form_id": "contact-form" }
  ],
  "notify_email": ["sales@example.com"],
  "notify_slack_webhook": "https://hooks.slack.com/services/..."
}
```

### 4. Multi-Condition Goal (AND)
> Trigger when a visitor views the pricing page AND submits the demo form

```json
{
  "name": "Qualified Lead",
  "goal_type": "multi_condition",
  "conditions": {
    "operator": "AND",
    "conditions": [
      { "type": "page_visit", "match": "contains", "value": "/pricing" },
      { "type": "form_submit", "form_id": "demo-request" }
    ]
  },
  "revenue_value": 200.00
}
```

### 5. Sequential Goal
> Trigger when a user follows the full purchase flow in order

```json
{
  "name": "Complete Purchase Flow",
  "goal_type": "sequential",
  "conditions": {
    "operator": "SEQUENCE",
    "conditions": [
      { "type": "page_visit", "match": "contains", "value": "/products" },
      { "type": "event", "event_name": "add_to_cart" },
      { "type": "page_visit", "match": "exact", "value": "/checkout" },
      { "type": "event", "event_name": "purchase" }
    ]
  },
  "use_dynamic_revenue": true
}
```

### 6. Scroll Depth Goal
> Trigger when a visitor reads 75%+ of a blog post

```json
{
  "name": "Blog Post Read",
  "goal_type": "scroll_depth",
  "conditions": [
    { "type": "scroll_depth", "path": "/blog/*", "min_pct": 75 }
  ]
}
```

### 7. Time on Page Goal
> Trigger when a visitor spends 60+ seconds on the demo page

```json
{
  "name": "Engaged Demo Viewer",
  "goal_type": "time_on_page",
  "conditions": [
    { "type": "time_on_page", "path": "/demo", "min_seconds": 60 }
  ]
}
```

---

## Shared Report Configuration Example

```json
{
  "site_id": "uuid",
  "title": "Monthly SEO Report — Acme Corp",
  "description": "Organic traffic performance for January 2026",
  "template": "seo",
  "logo_url": "https://storage.supabase.co/.../acme-logo.png",
  "brand_color": "#1e40af",
  "visible_sections": ["metrics", "chart", "pages", "referrers", "countries", "goals"],
  "hidden_metrics": ["revenue", "bounce_rate"],
  "date_range_mode": "last_month",
  "email_recipients": ["client@acme.com", "manager@acme.com"],
  "email_schedule": "monthly",
  "allow_embed": true
}
```

The report is accessible at:
- **Web**: `https://your-domain.com/report/a1b2c3d4e5f6...` (public, no login)
- **Embed**: `<iframe src="https://your-domain.com/embed/a1b2c3d4e5f6..." />`
- **PDF**: `https://your-domain.com/api/reports/a1b2c3d4e5f6.../pdf`

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account (free tier works) or local Supabase via Docker

### 1. Clone and install

```bash
git clone https://github.com/your-username/tracking.git
cd tracking
cp .env.example .env.local
pnpm install
```

### 2. Configure environment

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MaxMind (geo-location)
MAXMIND_LICENSE_KEY=your_maxmind_key

# Visitor hash salt (auto-rotated daily, this is the initial seed)
DAILY_SALT_SECRET=random_secret_string_min_32_chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Email (Resend — for scheduled reports + notifications)
RESEND_API_KEY=re_...
EMAIL_FROM=analytics@your-domain.com

# Cron secret (protects /api/cron/* endpoints)
CRON_SECRET=random_secret_string

# Optional: white-label
NEXT_PUBLIC_BRAND_NAME=Tracking
NEXT_PUBLIC_BRAND_LOGO=/logo.svg
```

### 3. Set up the database

```bash
# Using Supabase CLI
pnpm supabase db push

# Or run migrations manually in Supabase SQL editor
# Copy contents of supabase/migrations/*.sql in order
```

### 4. Build the tracking script

```bash
pnpm --filter tracker build
# Output: apps/web/public/t.js
```

### 5. Start the dev server

```bash
pnpm dev
```

### 6. Embed on your site

```html
<!-- Basic -->
<script defer src="https://your-domain.com/t.js" data-site-id="YOUR_SITE_ID"></script>

<!-- Full options -->
<script
  defer
  src="https://your-domain.com/t.js"
  data-site-id="YOUR_SITE_ID"
  data-api="https://your-domain.com/api/collect"
  data-track-forms="true"
  data-track-outbound="true"
  data-track-downloads="true"
  data-track-errors="true"
  data-track-rage-clicks="true"
  data-respect-dnt="false"
  data-debug="false"
></script>
```

### 7. Open the dashboard

Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### 8. Custom event examples

```html
<script>
  // Track a signup
  window.tracking.event("signup", { plan: "pro", source: "pricing_page" });

  // Set session-level properties (sent with every subsequent event)
  window.tracking.set({ user_type: "premium", company_size: "50-100" });

  // E-commerce: track a purchase
  window.tracking.ecommerce("purchase", {
    order_id: "ORD-1234",
    total: 99.99,
    currency: "EUR",
    items: [
      { id: "SKU-001", name: "Widget Pro", category: "Widgets", price: 49.99, quantity: 2 }
    ]
  });

  // Consent mode (for GDPR)
  window.tracking.consent(true);  // enable tracking
  window.tracking.consent(false); // disable tracking
</script>
```

---

## Production Deployment

### Vercel (recommended)

```bash
# Connect repo to Vercel, set env vars, deploy
vercel --prod
```

Add Vercel Cron jobs in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/refresh-views", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/rotate-salt",   "schedule": "0 0 * * *"   },
    { "path": "/api/cron/send-reports",  "schedule": "0 9 * * 1"   },
    { "path": "/api/cron/check-alerts",  "schedule": "*/10 * * * *" }
  ]
}
```

### Docker (self-hosted)

```bash
docker compose up -d
```

The `docker-compose.yml` includes:
- Next.js app (port 3000)
- Supabase (PostgreSQL + GoTrue + Realtime + PostgREST + Storage)
- Redis (rate limiting)
- MaxMind GeoIP updater (weekly cron)
- Cron container (materialized view refresh, salt rotation, reports, alerts)

---

## Roadmap

> **Legend:** ✅ Complete — 🟡 Partial / known limitation — ⬜ Not started / missing

### Infrastructure & Data Layer
- ✅ Project scaffolding (monorepo with pnpm workspaces + Turborepo)
- ✅ Database schema with RLS and materialized views — all 8 migrations (including system_settings KV)
- ✅ Supabase integration (client, server, middleware, service-role client)
- ✅ Auth middleware protecting `/dashboard` routes
- ✅ `vercel.json` — 4 cron jobs (refresh-views, rotate-salt, send-reports, check-alerts)
- ✅ Tracker copy step — build script copies `dist/t.js` → `apps/web/public/t.js`
- ✅ `.env.example` — placeholder credentials only
- 🟡 Docker Compose — defines web/db/studio/redis but missing GoTrue, PostgREST, Realtime containers; references nonexistent `Dockerfile`

### Tracking Script (`packages/tracker/`)
- ✅ Core tracking script — 22 real modules, all implemented
- ✅ Automatic page view tracking + SPA navigation (`pushState` / `popstate` / `hashchange`)
- ✅ Referrer & UTM parsing
- ✅ Performance metrics (TTFB, FCP, LCP, CLS, INP, FID)
- ✅ Scroll depth and outbound link tracking
- ✅ Form tracking (submissions, abandonment, field interaction, errors, sensitive-field filtering)
- ✅ File download tracking
- ✅ Rage click and dead click detection
- ✅ Element visibility tracking (IntersectionObserver)
- ✅ Copy/paste and print tracking
- ✅ Engaged time tracking (Page Visibility API)
- ✅ Error tracking (`window.onerror` + `unhandledrejection` with stack traces)
- ✅ Custom event API + custom properties
- ✅ E-commerce tracking
- ✅ Bot filtering (client-side)
- ✅ DNT / GPC respect
- ✅ Beacon API for unload events, fetch for regular events (correct strategy)
- ✅ Consent mode with `localStorage` persistence
- ✅ Debug mode
- ⬜ No test suite for tracker

### API Routes (27/27 complete)
- ✅ `/api/collect` — full 13-step ingest pipeline with rate limiting, bot filtering, geo, UA parsing, session upsert, **goal evaluation**
- ✅ `/api/sites` — full CRUD with auth
- ✅ `/api/stats` — uses `daily_stats` materialized view (falls back to raw events with 50K limit); includes UTM, retention cohort, ecommerce, errors, custom events breakdowns
- ✅ `/api/goals` — full CRUD + evaluate endpoint with all condition types (page_visit, event, form_submission, **click**, **revenue**) + AND/OR/SEQUENCE compounds
- ✅ `/api/funnels` — full CRUD + real funnel stats computation (progressive session filtering)
- ✅ `/api/forms` — queries `form_stats` materialized view + recent events + field-level stats
- ✅ `/api/reports` — full CRUD, password-protected public data endpoint, PDF generation
- ✅ `/api/export` — JSON + CSV with proper escaping, 10K row limit
- ✅ `/api/members` — list, invite, remove with ownership/membership verification
- ✅ `/api/api-keys` — full CRUD with `tk_live_` prefix, SHA-256 hash storage, key shown once
- ✅ `/api/alerts` — full CRUD
- ✅ `/api/annotations` — full CRUD with date range filtering
- ✅ `/api/webhooks` — manual test endpoint; real dispatch in goals/alerts engines
- ✅ `/api/auth/callback` + `/api/auth/confirm` — standard Supabase OAuth + email verification
- ✅ `/api/cron/refresh-views` — calls `refresh_materialized_views()` RPC
- ✅ `/api/cron/send-reports` — finds due reports, computes stats, sends HTML email
- ✅ `/api/cron/rotate-salt` — generates + persists salt to `system_settings` table + in-memory update
- ✅ `/api/cron/check-alerts` — all 5 alert types with email/Slack/webhook notifications + cooldown
- 🟡 `/api/cron/send-reports` — does NOT attach PDF to email
- 🟡 `/api/members` — invite email not sent for unregistered users

### Backend Libraries (all real implementations)
- ✅ Supabase clients (`lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
- ✅ Zod validators — schemas for all entities matching DB columns
- ✅ Visitor hash generation (`lib/hash.ts`) — SHA-256 of ip|ua|screen|lang|tz|salt, loads salt from DB on boot
- ✅ UA parser (`lib/ua-parser.ts`) — `ua-parser-js` v2
- ✅ Bot filter (`lib/bot-filter.ts`) — `isbot` + custom regex
- ✅ Rate limiter (`lib/rate-limiter.ts`) — Upstash Redis sliding window 100/min, graceful degradation
- ✅ Session manager (`lib/session-manager.ts`) — real upsert with all fields
- ✅ Geo-location (`lib/geo.ts`) — MaxMind GeoLite2 Reader
- ✅ Goals engine (`lib/goals-engine.ts`) — all condition types (page_visit, event, form_submission, click, revenue) + AND/OR/SEQUENCE + webhook/Slack
- ✅ Funnel engine (`lib/funnel-engine.ts`) — progressive session filtering in 500-session batches
- ✅ PDF generator (`lib/pdf-generator.ts`) — multi-page A4 PDF with `@react-pdf/renderer`
- ✅ Email (`lib/email.ts`) — Resend SDK: report emails, goal notifications, alert notifications
- ✅ Webhooks (`lib/webhooks.ts`) — `sendWebhook()`, `sendSlackWebhook()`, `dispatchGoalWebhooks()`

### Dashboard Pages (23/23 complete)
- ✅ Dashboard layout with full sidebar navigation (20 nav items, responsive, mobile overlay)
- ✅ Overview page — 6 metric cards, timeseries, 6 data tables, export bar, filter bar
- ✅ Multi-site switcher + inline site creation
- ✅ Real-time active visitors (Supabase Realtime + polling fallback) with badge in header
- ✅ Pages breakdown — real `unique_visitors`, `avg_time`, `bounce_rate` + entry/exit pages
- ✅ Referrers breakdown with UTM sources/mediums/campaigns tables
- ✅ Geo breakdown (countries + cities with BarChart + tables)
- ✅ Devices breakdown (PieChart + browser/OS tables)
- ✅ Events breakdown with custom events + recent events feed
- ✅ Retention / cohort analysis with RetentionMatrix
- ✅ E-commerce dashboard with dedicated RevenueTimeSeries chart
- ✅ Errors dashboard with grouped errors table
- ✅ User flow / path analysis with d3-sankey visualization
- ✅ Goals list, create (6 types with conditional fields), detail view
- ✅ Funnels list, create (dynamic steps, 3 step types), detail with FunnelChart
- ✅ Forms analytics (submission rates, abandonment, field-level BarChart)
- ✅ Reports CRUD (create with password, copy link, view, delete)
- ✅ Alerts CRUD (5 types with threshold, email, Slack webhook)
- ✅ Annotations CRUD with date range filtering
- ✅ API keys CRUD (7 scopes, prefix masking, shown once)
- ✅ Team management (invite, list with role badges, remove)
- ✅ Site settings (name, domain, timezone, public toggle, allowed origins, tracking snippet, delete)

### Public / Auth / Marketing Pages
- ✅ Public report viewer (password protection, MetricCards, TimeSeries, DataTables, PieChart, BarChart)
- ✅ Embeddable mini-dashboard widget (visitors + pageviews + TimeSeries)
- ✅ Landing page (hero, CTA, 6 feature cards)
- ✅ Pricing page (3 tiers with feature lists)
- ✅ Docs page (Getting Started, Tracking Script, API Reference, Deployment)
- ✅ Login, Register, Forgot Password (Supabase Auth)

### UI Components
- ✅ `charts/time-series.tsx` — Recharts AreaChart with gradients
- ✅ `charts/bar-chart.tsx` — Recharts BarChart
- ✅ `charts/pie-chart.tsx` — Recharts donut chart with 8 colors
- ✅ `charts/funnel-chart.tsx` — custom CSS bar funnel
- ✅ `charts/retention-matrix.tsx` — HTML table with heat-map coloring
- ✅ `charts/revenue-time-series.tsx` — dedicated Recharts AreaChart for revenue data
- ✅ `tables/data-table.tsx` — generic table with sorting, pagination, and search
- ✅ `metric-card.tsx` — title, value, trend, subtitle
- ✅ `site-switcher.tsx` — `<select>` dropdown
- ✅ `date-range-picker.tsx` — 6 preset periods + custom date range with date inputs
- ✅ `filter-bar.tsx` — global filtering by page/country/browser/os/device/referrer
- ✅ `export-bar.tsx` — CSV + JSON export buttons
- ✅ `annotation-marker.tsx` — overlay markers on time-series chart
- ✅ `active-visitors-badge.tsx` — live visitor count with pulsing indicator
- ✅ `dark-mode-toggle.tsx` — system/light/dark cycle, persists to localStorage
- ✅ `dashboard-shell.tsx` — full sidebar layout with nav, header, responsive mobile overlay

### Still Missing / Not Yet Implemented
- ⬜ **shadcn/ui components** — `components.json` configured but zero `components/ui/` installed; all UI is hand-written Tailwind
- ⬜ **World map visualization** (`charts/world-map.tsx`) — geo data exists but no map chart
- ⬜ **Sparkline charts** (`charts/sparkline.tsx`) — for inline metric trends
- ⬜ **Comparison periods** — "this month vs last month" toggle and visual diff
- ⬜ **Comparison toggle component** — UI for selecting comparison range
- ⬜ **PDF export button in UI** — `lib/pdf-generator.ts` exists but no button triggers it from dashboard
- ⬜ **PDF attachment in email reports** — cron sends HTML but doesn't attach PDF
- ⬜ **Scheduled email reports UI** — cron runs but no UI to configure email schedules per report
- ⬜ **Branded reports UI** — no UI to upload logo, set colors, add title/description
- ⬜ **Report templates** — no pre-built "SEO Report", "Campaign Report" etc.
- ⬜ **Report section toggles** — no UI to pick which sections to show/hide per shared report
- ⬜ **White-label mode** — no custom domain support or branding removal UI
- ⬜ **Multi-condition goal builder UI** — goals/new only supports single conditions; no AND/OR builder in the form
- ⬜ **Member invite email for unregistered users** — invite adds DB row but doesn't send sign-up email
- ⬜ **A/B test tracking integration**
- ⬜ **Supabase Edge Functions** for heavy aggregations
- ⬜ **Table partitioning** for high-volume sites
- ⬜ **Docker Compose** — missing GoTrue, PostgREST, Realtime containers + Dockerfile
- ⬜ **Test suite** (unit + integration + E2E)

## License

MIT