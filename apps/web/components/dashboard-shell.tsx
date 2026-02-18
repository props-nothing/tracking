'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ActiveVisitorsBadge } from '@/components/active-visitors-badge';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { SiteSwitcher } from '@/components/site-switcher';
import type { Site } from '@/hooks/use-site';

const navItems = [
  { href: '', label: 'Overview', icon: '📊' },
  { href: '/realtime', label: 'Realtime', icon: '⚡' },
  { href: '/pages', label: 'Pages', icon: '📄' },
  { href: '/referrers', label: 'Referrers', icon: '🔗' },
  { href: '/geo', label: 'Geography', icon: '🌍' },
  { href: '/devices', label: 'Devices', icon: '📱' },
  { href: '/events', label: 'Events', icon: '🎯' },
  { href: '/goals', label: 'Goals', icon: '🏆' },
  { href: '/funnels', label: 'Funnels', icon: '🔻' },
  { href: '/forms', label: 'Forms', icon: '📝' },
  { href: '/leads', label: 'Leads', icon: '👤' },
  { href: '/flow', label: 'User Flow', icon: '🔀' },
  { href: '/retention', label: 'Retention', icon: '🔄' },
  { href: '/ecommerce', label: 'E-commerce', icon: '💰' },
  { href: '/errors', label: 'Errors', icon: '🐛' },
  { href: '/reports', label: 'Reports', icon: '📑' },
  { href: '/alerts', label: 'Alerts', icon: '🔔' },
  { href: '/annotations', label: 'Annotations', icon: '📌' },
  { href: '/api-keys', label: 'API Keys', icon: '🔑' },
  { href: '/team', label: 'Team', icon: '👥' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

function DashboardShellInner({ userEmail, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);

  // Extract siteId from path: /dashboard/[siteId]/...
  const pathParts = pathname.split('/');
  const siteId = pathParts.length >= 3 && pathParts[2] !== '' ? pathParts[2] : null;
  const isOnSite = !!siteId;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Fetch user's sites for switcher
  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => setSites(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {isOnSite && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden rounded-md p-1.5 hover:bg-muted"
                aria-label="Toggle sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 5h14M3 10h14M3 15h14" />
                </svg>
              </button>
            )}
            <Link href="/dashboard" className="text-lg font-bold">
              Tracking
            </Link>
            {isOnSite && sites.length > 1 && (
              <SiteSwitcher
                sites={sites}
                currentSiteId={siteId}
                onSelect={(id) => router.push(`/dashboard/${id}`)}
              />
            )}
            {isOnSite && <ActiveVisitorsBadge siteId={siteId} />}
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {isOnSite && (
          <>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside
              className={`fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-56 border-r bg-background overflow-y-auto transition-transform duration-200 lg:sticky lg:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <nav className="p-3 space-y-0.5">
                {navItems.map((item) => {
                  const qs = searchParams.toString();
                  const href = `/dashboard/${siteId}${item.href}${qs ? '?' + qs : ''}`;
                  const isActive =
                    item.href === ''
                      ? pathname === `/dashboard/${siteId}`
                      : pathname.startsWith(href);

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Content */}
        <main className={`flex-1 min-w-0 mx-auto max-w-7xl px-4 py-8 lg:px-6 ${isOnSite ? 'lg:ml-0' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <Suspense>
      <DashboardShellInner {...props} />
    </Suspense>
  );
}
