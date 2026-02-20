import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
              Prijzen
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Documentatie
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Inloggen
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Privacyvriendelijke webanalyse
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Een zelfgehost alternatief voor Google Analytics. Jouw data, jouw eigendom.
            Geen cookies. AVG-conform. Lichtgewicht trackingscript.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Aan de slag
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              Bekijk op GitHub
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-8 sm:grid-cols-3">
          {[
            {
              title: 'Lichtgewicht script',
              description: 'Minder dan 5KB gecomprimeerd. Geen impact op de prestaties van je site.',
            },
            {
              title: 'Volledige analyse',
              description: 'Paginaweergaven, sessies, UTM-tracking, doelen, funnels, e-commerce en meer.',
            },
            {
              title: 'Privacy voorop',
              description: 'Geen cookies, geen persoonlijke gegevens, volledig AVG/CCPA/PECR-conform.',
            },
            {
              title: 'Realtime dashboard',
              description: 'Bekijk bezoekers op je site in realtime met live updates.',
            },
            {
              title: 'Zelfgehost',
              description: 'Draai op je eigen infrastructuur. Je data verlaat nooit je servers.',
            },
            {
              title: 'Open source',
              description: 'Volledig open source. Controleer de code, draag bij of fork het.',
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
              Documentatie
            </Link>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              Prijzen
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
