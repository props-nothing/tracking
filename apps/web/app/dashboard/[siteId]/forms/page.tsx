'use client';

import { use, useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard-context';
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
  const { queryString } = useDashboard();
  const [forms, setForms] = useState<FormData[]>([]);
  const [abandonFields, setAbandonFields] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forms?site_id=${siteId}&${queryString}`)
      .then((res) => res.json())
      .then((data) => {
        setForms(data.forms || []);
        setAbandonFields(data.abandon_fields || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, queryString]);

  const totalSubmissions = forms.reduce((s, f) => s + (f.submissions || 0), 0);
  const totalAbandonment = forms.reduce((s, f) => s + (f.abandonments || 0), 0);
  const avgCompletionRate = forms.length > 0
    ? Math.round(forms.reduce((s, f) => s + (f.completion_rate_pct || 0), 0) / forms.length)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Formulieranalyse</h1>
          <p className="text-sm text-muted-foreground">Inzendingen, afbrekingen en veldniveauanalyse</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Laden...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Totaal inzendingen" value={totalSubmissions.toString()} />
            <MetricCard title="Totaal afbrekingen" value={totalAbandonment.toString()} />
            <MetricCard title="Gem. voltooiingspercentage" value={`${avgCompletionRate}%`} />
          </div>

          {forms.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <h3 className="text-lg font-medium">Nog geen formulierdata</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Schakel formuliertracking in met <code className="rounded bg-muted px-1 text-xs">data-track-forms=&quot;true&quot;</code>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {forms.map((form) => (
                <div key={form.form_id} className="rounded-lg border bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{form.form_id || 'Onbekend formulier'}</h3>
                    <span className="text-sm text-muted-foreground">
                      {form.completion_rate_pct || 0}% voltooiing
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Inzendingen</p>
                      <p className="text-lg font-bold">{form.submissions || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Afbrekingen</p>
                      <p className="text-lg font-bold">{form.abandonments || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gem. tijd tot indienen</p>
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
                      <p className="mb-2 text-sm font-medium">Afbreekvelden</p>
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
