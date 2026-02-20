import Link from 'next/link';

const tiers = [
  {
    name: 'Zelfgehost',
    price: 'Gratis',
    description: 'Draai op je eigen infrastructuur',
    features: [
      'Onbeperkt aantal sites',
      'Onbeperkt aantal events',
      'Alle dashboardfuncties',
      'Doelen & funnels',
      'E-commerce tracking',
      'Gedeelde rapporten',
      'API-toegang',
      'Communityondersteuning',
    ],
    cta: 'Aan de slag',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Managed Cloud',
    price: '€9/maand',
    description: 'Wij hosten en beheren alles',
    features: [
      'Alles uit Zelfgehost',
      'Beheerde infrastructuur',
      'Automatische updates',
      'Dagelijkse back-ups',
      'Prioriteitsondersteuning',
      'Eigen domein',
      '99,9% uptime SLA',
      'Tot 1M events/maand',
    ],
    cta: 'Start gratis proefperiode',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Op maat',
    description: 'Voor grote organisaties',
    features: [
      'Alles uit Cloud',
      'Onbeperkt aantal events',
      'Eigen infrastructuur',
      'SSO / SAML',
      'Toegewijd accountmanager',
      'Maatwerkintegraties',
      'On-premise implementatie',
      'SLA met boeteclausules',
    ],
    cta: 'Neem contact op',
    href: 'mailto:hello@example.com',
    highlighted: false,
  },
];

export default function PricingPage() {
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

      <main className="flex-1 px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Eenvoudige, transparante prijzen</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Zelfgehost en gratis. Of laat ons het beheer doen.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg border p-8 ${tier.highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : 'bg-card'}`}
            >
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              <p className="mt-4 text-3xl font-bold">{tier.price}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-8 block rounded-md px-4 py-2.5 text-center text-sm font-medium ${tier.highlighted ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border hover:bg-muted'}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
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
