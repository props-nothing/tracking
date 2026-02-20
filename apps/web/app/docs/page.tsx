import Link from 'next/link';

const sections = [
  {
    title: 'Aan de slag',
    items: [
      {
        heading: 'Installatie',
        content: `Kloon de repository en installeer de afhankelijkheden:

\`\`\`bash
git clone https://github.com/yourorg/tracking.git
cd tracking
pnpm install
\`\`\``,
      },
      {
        heading: 'Omgevingsvariabelen',
        content: `Kopieer het voorbeeld-envbestand en vul je waarden in:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Vereiste variabelen:
- \`NEXT_PUBLIC_SUPABASE_URL\` — Je Supabase project-URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase anonieme sleutel
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service role-sleutel`,
      },
      {
        heading: 'Lokaal draaien',
        content: `Start de ontwikkelserver:

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in je browser.`,
      },
    ],
  },
  {
    title: 'Trackingscript',
    items: [
      {
        heading: 'Basisconfiguratie',
        content: `Voeg het trackingscript toe aan de \`<head>\` van je website:

\`\`\`html
<script defer data-site-id="YOUR_SITE_ID" src="https://your-domain.com/t.js"></script>
\`\`\`

Dat is alles! Het script volgt automatisch paginaweergaven, sessies en Web Vitals.`,
      },
      {
        heading: 'Configuratieopties',
        content: `Pas aan via data-attributen:

- \`data-site-id\` — Vereist. Je site-ID uit het dashboard.
- \`data-api\` — Aangepast collect-endpoint (standaard: scriptoorsprong + \`/api/collect\`)
- \`data-track-outbound\` — Volg uitgaande linkklikken (\`"true"\`)
- \`data-track-downloads\` — Volg bestandsdownloads (\`"true"\`)  
- \`data-track-forms\` — Volg formulierinteracties (\`"true"\`)
- \`data-track-errors\` — Volg JavaScript-fouten (\`"true"\`)
- \`data-track-ecommerce\` — Schakel e-commerce tracking in (\`"true"\`)
- \`data-hash\` — Op hash gebaseerde SPA-routing (\`"true"\`)`,
      },
      {
        heading: 'Aangepaste events',
        content: `Volg aangepaste events vanuit je code:

\`\`\`javascript
window.tracking('event', {
  name: 'signup_complete',
  props: { plan: 'pro' }
});
\`\`\``,
      },
      {
        heading: 'E-commerce',
        content: `Volg aankopen:

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
    title: 'API-referentie',
    items: [
      {
        heading: 'Authenticatie',
        content: `API-verzoeken vereisen een API-sleutel. Genereer er een via het dashboard onder **API-sleutels**.

Voeg de sleutel toe in de \`Authorization\`-header:

\`\`\`
Authorization: Bearer your-api-key
\`\`\``,
      },
      {
        heading: 'GET /api/stats',
        content: `Haal geaggregeerde analysedata op.

Queryparameters:
- \`site_id\` — Required
- \`period\` — \`day\`, \`7d\`, \`30d\`, \`month\`, \`year\`, \`custom\`
- \`metric\` — \`visitors\`, \`pageviews\`, \`events\`, \`ecommerce\`, \`errors\`
- \`start\`, \`end\` — ISO date strings for custom ranges`,
      },
      {
        heading: 'POST /api/collect',
        content: `Event-collectie-endpoint dat door het trackingscript wordt gebruikt.

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
    title: 'Implementatie',
    items: [
      {
        heading: 'Docker',
        content: `Implementeer met Docker Compose:

\`\`\`bash
docker compose up -d
\`\`\`

Dit start de webapp, PostgreSQL en Redis.`,
      },
      {
        heading: 'Vercel',
        content: `Implementeer de Next.js-app op Vercel:

1. Push naar GitHub
2. Importeer in Vercel
3. Stel omgevingsvariabelen in
4. Implementeer

Gebruik Supabase cloud voor de database.`,
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
            Inloggen
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">Documentatie</h1>
          <p className="mt-2 text-muted-foreground">Alles wat je nodig hebt om aan de slag te gaan met Tracking.</p>

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
