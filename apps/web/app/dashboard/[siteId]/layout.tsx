import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardControls } from './dashboard-controls';

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Skip this layout for non-UUID segments (e.g. /dashboard/portals)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(siteId)) {
    return <>{children}</>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const db = await createServiceClient();

  // Check if user is owner of this site
  const { data: site } = await db
    .from('sites')
    .select('user_id')
    .eq('id', siteId)
    .maybeSingle();

  const isOwner = site?.user_id === user.id;

  if (!isOwner) {
    // Check membership role
    const { data: membership } = await db
      .from('site_members')
      .select('role')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      redirect('/dashboard');
    }

    // Viewer/client members should open the shared report, not the admin dashboard
    if (membership.role === 'viewer' || membership.role === 'client') {
      // Find the report token for this site
      const { data: report } = await db
        .from('shared_reports')
        .select('token')
        .eq('site_id', siteId)
        .eq('template', 'overview')
        .limit(1)
        .maybeSingle();

      if (report?.token) {
        redirect(`/report/${report.token}`);
      }
      // If no report exists, redirect to dashboard home
      redirect('/dashboard');
    }
  }

  return (
    <Suspense>
      <DashboardControls>{children}</DashboardControls>
    </Suspense>
  );
}
