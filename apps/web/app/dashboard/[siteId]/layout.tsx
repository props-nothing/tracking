'use client';

import { Suspense } from 'react';
import { DashboardProvider } from '@/hooks/use-dashboard-context';
import { DateRangePicker } from '@/components/date-range-picker';
import { FilterBar } from '@/components/filter-bar';

function DashboardControls({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker />
          <FilterBar />
        </div>
      </div>
      {children}
    </DashboardProvider>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <DashboardControls>{children}</DashboardControls>
    </Suspense>
  );
}
