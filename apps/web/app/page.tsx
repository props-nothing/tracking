import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Tracking
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Log In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Privacy-friendly web analytics
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            A self-hosted alternative to Google Analytics. Own your data.
            No cookies. GDPR compliant. Lightweight tracking script.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-8 sm:grid-cols-3">
          {[
            {
              title: 'Lightweight Script',
              description: 'Under 5KB gzipped. No impact on your site performance.',
            },
            {
              title: 'Complete Analytics',
              description: 'Pageviews, sessions, UTM tracking, goals, funnels, ecommerce, and more.',
            },
            {
              title: 'Privacy First',
              description: 'No cookies, no personal data, fully GDPR/CCPA/PECR compliant.',
            },
            {
              title: 'Real-time Dashboard',
              description: 'See visitors on your site right now with live updates.',
            },
            {
              title: 'Self-hosted',
              description: 'Deploy on your own infrastructure. Your data never leaves your servers.',
            },
            {
              title: 'Open Source',
              description: 'Fully open source. Audit the code, contribute, or fork it.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6 text-left">
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Tracking</p>
          <div className="flex gap-4">
            <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
