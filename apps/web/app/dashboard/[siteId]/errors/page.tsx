'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { MetricCard } from '@/components/metric-card';

interface ErrorRow {
  error_message: string;
  error_source: string;
  error_line: number | null;
  count: number;
  last_seen: string;
}

export default function ErrorsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [totalErrors, setTotalErrors] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?site_id=${siteId}&period=${period}&metric=errors`)
      .then((res) => res.json())
      .then((data) => {
        setErrors(data.errors || []);
        setTotalErrors(data.total_errors || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">JS Errors</h1>
          <p className="text-sm text-muted-foreground">JavaScript error tracking</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard title="Total Errors" value={totalErrors.toString()} />
            <MetricCard title="Unique Errors" value={errors.length.toString()} />
          </div>

          {errors.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">No errors captured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Enable error tracking with <code className="rounded bg-muted px-1 text-xs">data-track-errors=&quot;true&quot;</code>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {errors.map((err, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-red-600">
                        {err.error_message}
                      </p>
                      {err.error_source && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {err.error_source}{err.error_line ? `:${err.error_line}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{err.count}x</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(err.last_seen).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
