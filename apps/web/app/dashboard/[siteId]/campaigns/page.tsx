'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/use-dashboard-context';
import { api } from '@/lib/api';
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/tables/data-table';
import { BarChart } from '@/components/charts/bar-chart';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import { CampaignConfigModal } from '@/components/campaign-config-modal';
import type { CampaignOverview, CampaignProvider } from '@/types';

const PROVIDER_LABELS: Record<CampaignProvider, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  mailchimp: 'Mailchimp',
};

const PROVIDER_ICONS: Record<CampaignProvider, string> = {
  google_ads: '🔍',
  meta_ads: '📘',
  mailchimp: '📧',
};

function formatCurrency(val: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(val);
}

function formatNumber(val: number): string {
  return new Intl.NumberFormat('nl-NL').format(Math.round(val));
}

export default function CampaignsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const { queryString } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<CampaignOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState<CampaignProvider | 'all'>('all');
  const [oauthMessage, setOauthMessage] = useState('');
  const [oauthCredentialSetId, setOauthCredentialSetId] = useState('');

  // Handle OAuth callback redirect params
  useEffect(() => {
    const connected = searchParams.get('google_ads_connected');
    const error = searchParams.get('error');
    if (connected === 'true') {
      const credSetId = searchParams.get('credential_set_id') || '';
      setOauthCredentialSetId(credSetId);
      setOauthMessage('Google Ads account succesvol gekoppeld! Selecteer hieronder een klantaccount en klik op Opslaan.');
      setConfigOpen(true);
      // Clean up URL params
      router.replace(`/dashboard/${siteId}/campaigns`);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        google_ads_auth_denied: 'Google Ads koppeling geannuleerd.',
        google_ads_auth_unauthorized: 'Je bent niet ingelogd. Log eerst in en probeer opnieuw.',
        google_ads_auth_token_exchange: 'Fout bij het ophalen van Google tokens. Probeer opnieuw.',
        google_ads_auth_save_failed: 'Fout bij het opslaan van de credentials. Probeer opnieuw.',
        google_ads_auth_server_config: 'Google Ads OAuth is niet geconfigureerd op de server.',
      };
      setOauthMessage(errorMessages[error] || `Google Ads koppeling mislukt: ${error}`);
      router.replace(`/dashboard/${siteId}/campaigns`);
    }
  }, [searchParams, siteId, router]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const providerParam = providerFilter !== 'all' ? `&provider=${providerFilter}` : '';

    // Pass the full queryString which contains period/from/to — the API resolves dates server-side
    api
      .get<CampaignOverview>(`/api/campaigns?site_id=${siteId}&${queryString}${providerParam}`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [siteId, queryString, providerFilter]);

  useEffect(fetchData, [fetchData]);

  const hasAnyIntegration = data?.providers?.some((p) => p.enabled) ?? false;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campagnes"
        description="Prestaties van Google Ads, Meta Ads en Mailchimp"
        action={
          <button
            onClick={() => setConfigOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Integraties beheren
          </button>
        }
      />

      {/* OAuth callback message */}
      {oauthMessage && (
        <div className={`flex items-center justify-between rounded-lg border p-4 text-sm ${
          oauthMessage.includes('succesvol') || oauthMessage.includes('gekoppeld')
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
        }`}>
          <span>{oauthMessage}</span>
          <button
            onClick={() => setOauthMessage('')}
            className="ml-4 text-current hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : !hasAnyIntegration ? (
        <EmptyState
          title="Geen campagne-integraties"
          description="Koppel Google Ads, Meta Ads of Mailchimp om campagnedata in je dashboard te zien."
        >
          <button
            onClick={() => setConfigOpen(true)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Integratie toevoegen
          </button>
        </EmptyState>
      ) : (
        <>
          {/* Provider filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <div className="flex rounded-lg border">
              <button
                onClick={() => setProviderFilter('all')}
                className={`px-3 py-1.5 text-sm ${providerFilter === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-l-lg`}
              >
                Alle
              </button>
              {(data?.providers || [])
                .filter((p) => p.enabled)
                .map((p) => (
                  <button
                    key={p.provider}
                    onClick={() => setProviderFilter(p.provider as CampaignProvider)}
                    className={`px-3 py-1.5 text-sm ${providerFilter === p.provider ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} last:rounded-r-lg`}
                  >
                    {PROVIDER_ICONS[p.provider as CampaignProvider]} {PROVIDER_LABELS[p.provider as CampaignProvider]}
                    {p.last_sync_status === 'success' && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* Provider status badges */}
          <div className="flex flex-wrap gap-3">
            {(data?.providers || [])
              .filter((p) => p.enabled)
              .map((p) => (
                <div key={p.provider} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
                  <span>{PROVIDER_ICONS[p.provider as CampaignProvider]}</span>
                  <span className="font-medium">{PROVIDER_LABELS[p.provider as CampaignProvider]}</span>
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    p.last_sync_status === 'success' ? 'bg-green-500' :
                    p.last_sync_status === 'error' ? 'bg-red-500' :
                    p.last_sync_status === 'syncing' ? 'bg-amber-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  {p.last_synced_at && (
                    <span className="text-muted-foreground">
                      {new Date(p.last_synced_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
          </div>

          {/* KPI Cards */}
          {data?.totals && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <MetricCard
                title="Resultaten"
                value={formatNumber(data.totals.results || data.totals.conversions)}
                subtitle={data.totals.cost_per_result > 0 ? `CPR ${formatCurrency(data.totals.cost_per_result)}` : undefined}
              />
              <MetricCard
                title="Uitgegeven"
                value={formatCurrency(data.totals.cost)}
                subtitle={`CPC ${formatCurrency(data.totals.avg_cpc)}`}
              />
              <MetricCard
                title="Vertoningen"
                value={formatNumber(data.totals.impressions)}
                subtitle={data.totals.cpm > 0 ? `CPM ${formatCurrency(data.totals.cpm)}` : undefined}
              />
              <MetricCard
                title="Klikken"
                value={formatNumber(data.totals.link_clicks || data.totals.clicks)}
                subtitle={`CTR ${data.totals.ctr}%`}
              />
              <MetricCard
                title="Bereik"
                value={formatNumber(data.totals.reach)}
                subtitle={data.totals.frequency > 0 ? `Frequentie ${data.totals.frequency}` : undefined}
              />
              <MetricCard
                title="ROAS"
                value={`${data.totals.roas}x`}
                subtitle={data.totals.conversion_value > 0 ? `Waarde ${formatCurrency(data.totals.conversion_value)}` : undefined}
              />
            </div>
          )}

          {/* Cost chart over time */}
          {data?.timeseries && data.timeseries.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-4 text-sm font-medium">Kosten per dag</h3>
              <BarChart
                data={data.timeseries
                  .reduce((acc, t) => {
                    const existing = acc.find((a) => a.name === t.date);
                    if (existing) {
                      existing.value += t.cost;
                    } else {
                      acc.push({ name: t.date, value: t.cost });
                    }
                    return acc;
                  }, [] as { name: string; value: number }[])
                  .sort((a, b) => a.name.localeCompare(b.name))}
                color="var(--color-chart-1)"
                height={250}
              />
            </div>
          )}

          {/* Provider breakdown */}
          {data?.by_provider && data.by_provider.length > 1 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-4 text-sm font-medium">Per platform</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4">Platform</th>
                      <th className="pb-2 pr-4 text-right">Vertoningen</th>
                      <th className="pb-2 pr-4 text-right">Klikken</th>
                      <th className="pb-2 pr-4 text-right">CTR</th>
                      <th className="pb-2 pr-4 text-right">Kosten</th>
                      <th className="pb-2 pr-4 text-right">Conversies</th>
                      <th className="pb-2 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_provider.map((row) => (
                      <tr key={row.provider} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">
                          {PROVIDER_ICONS[row.provider as CampaignProvider]}{' '}
                          {PROVIDER_LABELS[row.provider as CampaignProvider]}
                        </td>
                        <td className="py-2 pr-4 text-right">{formatNumber(row.impressions)}</td>
                        <td className="py-2 pr-4 text-right">{formatNumber(row.clicks)}</td>
                        <td className="py-2 pr-4 text-right">{row.ctr}%</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(row.cost)}</td>
                        <td className="py-2 pr-4 text-right">{formatNumber(row.conversions)}</td>
                        <td className="py-2 text-right">{row.roas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaign details table – Facebook Ads Manager style */}
          <DataTable
            title="Campagnes"
            columns={[
              { key: 'campaign_name', label: 'Campagne' },
              { key: 'delivery_fmt', label: 'Status' },
              { key: 'results_fmt', label: 'Resultaten', align: 'right' },
              { key: 'cost_per_result_fmt', label: 'Kosten/resultaat', align: 'right' },
              { key: 'cost_fmt', label: 'Uitgegeven', align: 'right' },
              { key: 'budget_fmt', label: 'Budget', align: 'right' },
              { key: 'impressions_fmt', label: 'Vertoningen', align: 'right' },
              { key: 'reach_fmt', label: 'Bereik', align: 'right' },
              { key: 'frequency_fmt', label: 'Frequentie', align: 'right' },
              { key: 'cpm_fmt', label: 'CPM', align: 'right' },
              { key: 'link_clicks_fmt', label: 'Linkklikken', align: 'right' },
              { key: 'ctr_fmt', label: 'CTR', align: 'right' },
              { key: 'ends_fmt', label: 'Eindigt' },
            ]}
            data={(data?.campaigns || []).map((c) => {
              const em = c.extra_metrics || {};
              const deliveryMap: Record<string, string> = {
                ACTIVE: '🟢 Actief',
                PAUSED: '⏸ Gepauzeerd',
                DELETED: '🗑 Verwijderd',
                ARCHIVED: '📦 Gearchiveerd',
                IN_PROCESS: '⏳ Bezig',
                WITH_ISSUES: '⚠️ Problemen',
                CAMPAIGN_PAUSED: '⏸ Gepauzeerd',
                ADSET_PAUSED: '⏸ Adset gepauzeerd',
                active: '🟢 Actief',
                paused: '⏸ Gepauzeerd',
                sent: '✓ Verzonden',
                unknown: '—',
              };
              const delivery = deliveryMap[String(em.delivery || c.campaign_status || '')] || String(em.delivery || c.campaign_status || '—');
              const results = Number(em.results) || c.conversions || 0;
              const costPerResult = Number(em.cost_per_result) || (results > 0 ? c.cost / results : 0);
              const budget = Number(em.budget) || 0;
              const reach = Number(em.reach) || 0;
              const freq = Number(em.frequency) || 0;
              const cpm = Number(em.cpm) || (c.impressions > 0 ? (c.cost / c.impressions) * 1000 : 0);
              const linkClicks = Number(em.link_clicks) || 0;
              const endTime = em.end_time ? new Date(String(em.end_time)).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

              return {
                ...c,
                delivery_fmt: delivery,
                results_fmt: formatNumber(results),
                cost_per_result_fmt: costPerResult > 0 ? formatCurrency(costPerResult) : '—',
                cost_fmt: formatCurrency(c.cost),
                budget_fmt: budget > 0 ? formatCurrency(budget) : '—',
                impressions_fmt: formatNumber(c.impressions),
                reach_fmt: reach > 0 ? formatNumber(reach) : '—',
                frequency_fmt: freq > 0 ? freq.toFixed(2) : '—',
                cpm_fmt: cpm > 0 ? formatCurrency(cpm) : '—',
                link_clicks_fmt: linkClicks > 0 ? formatNumber(linkClicks) : formatNumber(c.clicks),
                ctr_fmt: `${c.ctr}%`,
                ends_fmt: endTime,
              };
            })}
            searchable
            pageSize={20}
            emptyMessage="Geen campagnedata gevonden. Synchroniseer je integraties om data te zien."
          />

          {/* Mailchimp-specific metrics if mailchimp data present */}
          {providerFilter === 'mailchimp' && data?.campaigns?.some((c) => c.provider === 'mailchimp') && (
            <DataTable
              title="E-mailcampagne details"
              columns={[
                { key: 'campaign_name', label: 'Campagne' },
                { key: 'sends', label: 'Verzonden', align: 'right' },
                { key: 'unique_opens', label: 'Geopend', align: 'right' },
                { key: 'open_rate', label: 'Open rate', align: 'right' },
                { key: 'unique_clicks', label: 'Geklikken', align: 'right' },
                { key: 'click_rate', label: 'Click rate', align: 'right' },
                { key: 'unsubscribes', label: 'Uitschrijvingen', align: 'right' },
              ]}
              data={(data?.campaigns || [])
                .filter((c) => c.provider === 'mailchimp')
                .map((c) => ({
                  campaign_name: c.campaign_name,
                  sends: formatNumber(Number(c.extra_metrics?.sends) || 0),
                  unique_opens: formatNumber(Number(c.extra_metrics?.unique_opens) || 0),
                  open_rate: `${(Number(c.extra_metrics?.open_rate) * 100 || 0).toFixed(1)}%`,
                  unique_clicks: formatNumber(Number(c.extra_metrics?.unique_clicks) || 0),
                  click_rate: `${(Number(c.extra_metrics?.click_rate) * 100 || 0).toFixed(1)}%`,
                  unsubscribes: formatNumber(Number(c.extra_metrics?.unsubscribes) || 0),
                }))}
              pageSize={20}
            />
          )}
        </>
      )}

      <CampaignConfigModal
        siteId={siteId}
        open={configOpen}
        onClose={() => { setConfigOpen(false); setOauthCredentialSetId(''); fetchData(); }}
        oauthCredentialSetId={oauthCredentialSetId}
      />
    </div>
  );
}
