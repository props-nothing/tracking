import Link from 'next/link';

const tiers = [
  {
    name: 'Self-Hosted',
    price: 'Free',
    description: 'Host on your own infrastructure',
    features: [
      'Unlimited sites',
      'Unlimited events',
      'All dashboard features',
      'Goals & funnels',
      'E-commerce tracking',
      'Shared reports',
      'API access',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Managed Cloud',
    price: '$9/mo',
    description: 'We host and manage everything',
    features: [
      'Everything in Self-Hosted',
      'Managed infrastructure',
      'Automatic updates',
      'Daily backups',
      'Priority support',
      'Custom domain',
      '99.9% uptime SLA',
      'Up to 1M events/mo',
    ],
    cta: 'Start Free Trial',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Everything in Cloud',
      'Unlimited events',
      'Dedicated infrastructure',
      'SSO / SAML',
      'Dedicated account manager',
      'Custom integrations',
      'On-premise deployment',
      'SLA with penalties',
    ],
    cta: 'Contact Us',
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
            Log In
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Self-host for free. Or let us manage it for you.
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
