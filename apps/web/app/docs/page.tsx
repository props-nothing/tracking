import Link from 'next/link';

const sections = [
  {
    title: 'Getting Started',
    items: [
      {
        heading: 'Installation',
        content: `Clone the repo and install dependencies:

\`\`\`bash
git clone https://github.com/yourorg/tracking.git
cd tracking
pnpm install
\`\`\``,
      },
      {
        heading: 'Environment Variables',
        content: `Copy the example env file and fill in your values:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Required variables:
- \`NEXT_PUBLIC_SUPABASE_URL\` — Your Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase anonymous key
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service role key`,
      },
      {
        heading: 'Running Locally',
        content: `Start the development server:

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.`,
      },
    ],
  },
  {
    title: 'Tracking Script',
    items: [
      {
        heading: 'Basic Setup',
        content: `Add the tracking script to your website's \`<head>\`:

\`\`\`html
<script defer data-site-id="YOUR_SITE_ID" src="https://your-domain.com/t.js"></script>
\`\`\`

That's it! The script automatically tracks pageviews, sessions, and Web Vitals.`,
      },
      {
        heading: 'Configuration Options',
        content: `Customize via data attributes:

- \`data-site-id\` — Required. Your site ID from the dashboard.
- \`data-api\` — Custom collect endpoint (default: script origin + \`/api/collect\`)
- \`data-track-outbound\` — Track outbound link clicks (\`"true"\`)
- \`data-track-downloads\` — Track file downloads (\`"true"\`)  
- \`data-track-forms\` — Track form interactions (\`"true"\`)
- \`data-track-errors\` — Track JavaScript errors (\`"true"\`)
- \`data-track-ecommerce\` — Enable e-commerce tracking (\`"true"\`)
- \`data-hash\` — Hash-based SPA routing (\`"true"\`)`,
      },
      {
        heading: 'Custom Events',
        content: `Track custom events from your code:

\`\`\`javascript
window.tracking('event', {
  name: 'signup_complete',
  props: { plan: 'pro' }
});
\`\`\``,
      },
      {
        heading: 'E-commerce',
        content: `Track purchases:

\`\`\`javascript
window.tracking('ecommerce', {
  event: 'purchase',
  transaction_id: 'txn_123',
  value: 59.99,
  currency: 'USD',
  items: [
    { id: 'sku_1', name: 'Widget', price: 29.99, quantity: 2 }
  ]
});
\`\`\``,
      },
    ],
  },
  {
    title: 'API Reference',
    items: [
      {
        heading: 'Authentication',
        content: `API requests require an API key. Generate one from the dashboard under **API Keys**.

Include the key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer your-api-key
\`\`\``,
      },
      {
        heading: 'GET /api/stats',
        content: `Retrieve aggregated analytics data.

Query parameters:
- \`site_id\` — Required
- \`period\` — \`day\`, \`7d\`, \`30d\`, \`month\`, \`year\`, \`custom\`
- \`metric\` — \`visitors\`, \`pageviews\`, \`events\`, \`ecommerce\`, \`errors\`
- \`start\`, \`end\` — ISO date strings for custom ranges`,
      },
      {
        heading: 'POST /api/collect',
        content: `Event collection endpoint used by the tracking script.

Body:
\`\`\`json
{
  "site_id": "uuid",
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "event_name": "pageview"
}
\`\`\``,
      },
    ],
  },
  {
    title: 'Deployment',
    items: [
      {
        heading: 'Docker',
        content: `Deploy with Docker Compose:

\`\`\`bash
docker compose up -d
\`\`\`

This starts the web app, PostgreSQL, and Redis.`,
      },
      {
        heading: 'Vercel',
        content: `Deploy the Next.js app to Vercel:

1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

Use Supabase cloud for the database.`,
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Tracking
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Log In
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-2 text-muted-foreground">Everything you need to get started with Tracking.</p>

          <div className="mt-12 space-y-16">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-bold border-b pb-2">{section.title}</h2>
                <div className="mt-6 space-y-10">
                  {section.items.map((item) => (
                    <div key={item.heading}>
                      <h3 className="text-lg font-semibold">{item.heading}</h3>
                      <div className="mt-3 prose prose-sm prose-neutral dark:prose-invert max-w-none whitespace-pre-line text-sm text-muted-foreground">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Tracking</p>
        </div>
      </footer>
    </div>
  );
}
