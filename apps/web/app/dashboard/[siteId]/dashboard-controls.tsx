'use client';

import { DashboardProvider } from '@/hooks/use-dashboard-context';
import { DateRangePicker } from '@/components/date-range-picker';
import { FilterBar } from '@/components/filter-bar';

export function DashboardControls({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DateRangePicker />
          <FilterBar />
        </div>
      </div>
      {children}
    </DashboardProvider>
  );
}
