'use client';

import { use, useEffect, useState } from 'react';
import { useDateRange } from '@/hooks/use-date-range';
import { DateRangePicker } from '@/components/date-range-picker';
import { MetricCard } from '@/components/metric-card';
import { BarChart } from '@/components/charts/bar-chart';

interface FormData {
  form_id: string;
  submissions: number;
  abandonments: number;
  completion_rate_pct: number;
  avg_time_to_submit_ms: number;
}

export default function FormsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { period, setPeriod } = useDateRange();
  const [forms, setForms] = useState<FormData[]>([]);
  const [abandonFields, setAbandonFields] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forms?site_id=${siteId}`)
      .then((res) => res.json())
      .then((data) => {
        setForms(data.forms || []);
        setAbandonFields(data.abandon_fields || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId]);

  const totalSubmissions = forms.reduce((s, f) => s + (f.submissions || 0), 0);
  const totalAbandonment = forms.reduce((s, f) => s + (f.abandonments || 0), 0);
  const avgCompletionRate = forms.length > 0
    ? Math.round(forms.reduce((s, f) => s + (f.completion_rate_pct || 0), 0) / forms.length)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Analytics</h1>
          <p className="text-sm text-muted-foreground">Submissions, abandonment, and field-level analytics</p>
        </div>
        <DateRangePicker period={period} onPeriodChange={setPeriod} />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Total Submissions" value={totalSubmissions.toString()} />
            <MetricCard title="Total Abandonments" value={totalAbandonment.toString()} />
            <MetricCard title="Avg. Completion Rate" value={`${avgCompletionRate}%`} />
          </div>

          {forms.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">No form data yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Enable form tracking with <code className="rounded bg-muted px-1 text-xs">data-track-forms=&quot;true&quot;</code>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {forms.map((form) => (
                <div key={form.form_id} className="rounded-lg border bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{form.form_id || 'Unknown Form'}</h3>
                    <span className="text-sm text-muted-foreground">
                      {form.completion_rate_pct || 0}% completion
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Submissions</p>
                      <p className="text-lg font-bold">{form.submissions || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Abandonments</p>
                      <p className="text-lg font-bold">{form.abandonments || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg. Time to Submit</p>
                      <p className="text-lg font-bold">
                        {form.avg_time_to_submit_ms
                          ? `${Math.round(form.avg_time_to_submit_ms / 1000)}s`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Abandon field breakdown */}
                  {abandonFields[form.form_id] && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Abandon Fields</p>
                      <BarChart
                        data={Object.entries(abandonFields[form.form_id])
                          .sort((a, b) => b[1] - a[1])
                          .map(([name, value]) => ({ name, value }))}
                        color="#ef4444"
                        height={200}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
