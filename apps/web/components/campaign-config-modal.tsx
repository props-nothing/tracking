'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CampaignIntegration, CampaignProvider, CampaignCredentialSet } from '@/types';

interface CampaignConfigModalProps {
  siteId: string;
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { key: CampaignProvider; label: string; icon: string; description: string; setupUrl: string; setupHelp: string }[] = [
  {
    key: 'google_ads',
    label: 'Google Ads',
    icon: '🔍',
    description: 'Importeer campagnedata van Google Ads (Search, Display, Shopping, YouTube)',
    setupUrl: 'https://ads.google.com',
    setupHelp: '1. Klik op "Koppel Google Ads" om in te loggen met je Google-account\n2. Geef toestemming om je advertentiedata te lezen\n3. Vul je Google Ads Klant-ID in (te vinden rechtsboven in Google Ads, bijv. 123-456-7890)\n4. Bij een MCC-account: vul ook het MCC Klant-ID in\n\nDe koppeling verloopt automatisch via OAuth — je hoeft geen tokens handmatig te kopiëren.',
  },
  {
    key: 'meta_ads',
    label: 'Meta Ads',
    icon: '📘',
    description: 'Importeer campagnedata van Facebook, Instagram en Meta Audience Network',
    setupUrl: 'https://developers.facebook.com/tools/explorer/',
    setupHelp: '1. Ga naar Meta for Developers (https://developers.facebook.com)\n2. Maak een app aan (type: Business)\n3. Voeg het product "Marketing API" toe aan je app\n4. Ga naar Graph API Explorer (https://developers.facebook.com/tools/explorer/)\n5. Selecteer je app, klik "Generate Access Token"\n6. Vereiste permissies: ads_read, ads_management, read_insights\n7. Wissel het korte token om voor een langlevend token via: https://developers.facebook.com/tools/debug/accesstoken/\n8. Je Advertentieaccount-ID vind je in Meta Ads Manager onder Accountinstellingen (act_xxxxx)\n\nTip: Gebruik een System User token voor permanente toegang zonder verloopdatum.',
  },
  {
    key: 'mailchimp',
    label: 'Mailchimp',
    icon: '📧',
    description: 'Importeer e-mailcampagneresultaten van Mailchimp',
    setupUrl: 'https://us1.admin.mailchimp.com/account/api/',
    setupHelp: '1. Log in op Mailchimp\n2. Ga naar Account → Extras → API Keys\n3. Klik "Create A Key" om een API Key aan te maken\n4. De serverprefix is het deel na het streepje in je API Key (bijv. "us1" bij "xxx-us1")\n5. Optioneel: vul de Lijst-ID (Audience ID) in om te filteren. Vind deze onder Audience → Settings → Audience name and defaults.\n\nGeen callback URL nodig — Mailchimp gebruikt alleen API Key authenticatie.',
  },
];

const CREDENTIAL_FIELDS: Record<CampaignProvider, { key: string; label: string; placeholder: string; type?: string }[]> = {
  google_ads: [
    { key: 'customer_id', label: 'Klant-ID', placeholder: '123-456-7890' },
    { key: 'login_customer_id', label: 'MCC Klant-ID (optioneel)', placeholder: '123-456-7890' },
  ],
  meta_ads: [
    { key: 'access_token', label: 'Access Token', placeholder: 'EAA...', type: 'password' },
    { key: 'ad_account_id', label: 'Advertentieaccount-ID', placeholder: 'act_123456789' },
    { key: 'app_id', label: 'App ID (optioneel)', placeholder: '123456789' },
    { key: 'app_secret', label: 'App Secret (optioneel)', placeholder: '', type: 'password' },
  ],
  mailchimp: [
    { key: 'api_key', label: 'API Key', placeholder: 'xxxxxxxxxx-us1', type: 'password' },
    { key: 'server_prefix', label: 'Serverprefix', placeholder: 'us1' },
    { key: 'list_id', label: 'Lijst-ID (optioneel)', placeholder: 'abc123def' },
  ],
};

const SYNC_OPTIONS = [
  { value: 'hourly', label: 'Elk uur' },
  { value: 'daily', label: 'Dagelijks' },
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'manual', label: 'Alleen handmatig' },
];

export function CampaignConfigModal({ siteId, open, onClose }: CampaignConfigModalProps) {
  const [integrations, setIntegrations] = useState<CampaignIntegration[]>([]);
  const [credentialSets, setCredentialSets] = useState<CampaignCredentialSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CampaignProvider>('google_ads');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Credential mode: 'select' = use existing set, 'new' = create new set, 'manual' = direct credentials
  const [credMode, setCredMode] = useState<Record<CampaignProvider, 'select' | 'new' | 'manual'>>({
    google_ads: 'select',
    meta_ads: 'select',
    mailchimp: 'select',
  });

  // Selected credential set per provider
  const [selectedSetId, setSelectedSetId] = useState<Record<CampaignProvider, string>>({
    google_ads: '',
    meta_ads: '',
    mailchimp: '',
  });

  // Name for new credential set
  const [newSetName, setNewSetName] = useState<Record<CampaignProvider, string>>({
    google_ads: '',
    meta_ads: '',
    mailchimp: '',
  });

  // Local edit state for credentials (not masked)
  const [editCredentials, setEditCredentials] = useState<Record<CampaignProvider, Record<string, string>>>({
    google_ads: {},
    meta_ads: {},
    mailchimp: {},
  });
  const [editEnabled, setEditEnabled] = useState<Record<CampaignProvider, boolean>>({
    google_ads: false,
    meta_ads: false,
    mailchimp: false,
  });
  const [editSyncFreq, setEditSyncFreq] = useState<Record<CampaignProvider, string>>({
    google_ads: 'daily',
    meta_ads: 'daily',
    mailchimp: 'daily',
  });
  const [editCampaignFilter, setEditCampaignFilter] = useState<Record<CampaignProvider, string>>({
    google_ads: '',
    meta_ads: '',
    mailchimp: '',
  });

  const fetchAll = useCallback(() => {
    if (!open || !siteId) return;
    setLoading(true);

    Promise.all([
      api.get<{ integrations: CampaignIntegration[] }>(`/api/campaign-integrations?site_id=${siteId}`),
      api.get<{ credential_sets: CampaignCredentialSet[] }>('/api/credential-sets'),
    ])
      .then(([intData, setData]) => {
        setIntegrations(intData.integrations || []);
        setCredentialSets(setData.credential_sets || []);

        const creds: Record<string, Record<string, string>> = { google_ads: {}, meta_ads: {}, mailchimp: {} };
        const enabled: Record<string, boolean> = { google_ads: false, meta_ads: false, mailchimp: false };
        const freq: Record<string, string> = { google_ads: 'daily', meta_ads: 'daily', mailchimp: 'daily' };
        const filters: Record<string, string> = { google_ads: '', meta_ads: '', mailchimp: '' };
        const modes: Record<string, 'select' | 'new' | 'manual'> = { google_ads: 'select', meta_ads: 'select', mailchimp: 'select' };
        const selIds: Record<string, string> = { google_ads: '', meta_ads: '', mailchimp: '' };

        for (const integration of intData.integrations || []) {
          enabled[integration.provider] = integration.enabled;
          freq[integration.provider] = integration.sync_frequency;
          filters[integration.provider] = integration.campaign_filter || '';
          if (integration.credential_set_id) {
            modes[integration.provider] = 'select';
            selIds[integration.provider] = integration.credential_set_id;
          } else {
            // Has direct credentials stored
            modes[integration.provider] = 'manual';
          }
        }

        setEditEnabled(enabled as typeof editEnabled);
        setEditSyncFreq(freq as typeof editSyncFreq);
        setEditCampaignFilter(filters as typeof editCampaignFilter);
        setEditCredentials(creds as typeof editCredentials);
        setCredMode(modes as typeof credMode);
        setSelectedSetId(selIds as typeof selectedSetId);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, siteId]);

  useEffect(fetchAll, [fetchAll]);

  const handleSave = async (provider: CampaignProvider) => {
    setSaving(true);
    setMessage('');
    try {
      // Validate Google Ads customer_id format before saving
      if (provider === 'google_ads') {
        const custId = editCredentials[provider]?.customer_id;
        if (custId && !/^[\d-]+$/.test(custId)) {
          setMessage('Ongeldig Klant-ID. Het moet numeriek zijn (bijv. 123-456-7890).');
          setSaving(false);
          return;
        }
        const loginCustId = editCredentials[provider]?.login_customer_id;
        if (loginCustId && !/^[\d-]+$/.test(loginCustId)) {
          setMessage('Ongeldig MCC Klant-ID. Het moet numeriek zijn (bijv. 123-456-7890).');
          setSaving(false);
          return;
        }
      }

      const mode = credMode[provider];

      let credentialSetId: string | null = null;

      if (mode === 'new') {
        // Create a new credential set first
        const setName = newSetName[provider]?.trim();
        if (!setName) {
          setMessage('Geef een naam op voor de credential set.');
          setSaving(false);
          return;
        }
        const newSet = await api.post<CampaignCredentialSet>('/api/credential-sets', {
          provider,
          name: setName,
          credentials: editCredentials[provider],
        });
        credentialSetId = newSet.id;
      } else if (mode === 'select') {
        credentialSetId = selectedSetId[provider] || null;
        if (!credentialSetId) {
          setMessage('Selecteer een bestaande credential set of maak een nieuwe aan.');
          setSaving(false);
          return;
        }
      }

      const body: Record<string, unknown> = {
        site_id: siteId,
        provider,
        enabled: editEnabled[provider],
        sync_frequency: editSyncFreq[provider],
        credential_set_id: credentialSetId,
        campaign_filter: editCampaignFilter[provider]?.trim() || null,
      };

      // For manual mode or new set, include the credentials directly too
      if (mode === 'manual') {
        body.credentials = editCredentials[provider];
        body.credential_set_id = null;
      } else {
        // When using a credential set, still include any extra fields the user filled in
        // (e.g. customer_id for Google Ads) — these override the set at sync time
        const extraCreds = editCredentials[provider];
        const hasExtraCreds = Object.values(extraCreds).some((v) => v && v.length > 0);
        body.credentials = hasExtraCreds ? extraCreds : {};
      }

      await api.post('/api/campaign-integrations', body);
      setMessage('Integratie opgeslagen!');
      fetchAll();
    } catch {
      setMessage('Opslaan mislukt.');
    }
    setSaving(false);
  };

  const handleSync = async (provider: CampaignProvider) => {
    setSyncing(provider);
    setMessage('');
    try {
      await api.post('/api/campaigns/sync', { site_id: siteId, provider });
      setMessage('Synchronisatie gestart!');
      fetchAll();
    } catch {
      setMessage('Synchronisatie mislukt.');
    }
    setSyncing(null);
  };

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Weet je zeker dat je deze integratie en alle bijbehorende campagnedata wilt verwijderen?')) return;
    try {
      await api.delete(`/api/campaign-integrations?id=${integrationId}`);
      fetchAll();
      setMessage('Integratie verwijderd.');
    } catch {
      setMessage('Verwijderen mislukt.');
    }
  };

  if (!open) return null;

  const currentIntegration = integrations.find((i) => i.provider === activeTab);
  const setsForProvider = credentialSets.filter((s) => s.provider === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Campagne-integraties</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Integraties laden...</div>
        ) : (
          <>
            {/* Provider tabs */}
            <div className="flex border-b">
              {PROVIDERS.map((p) => {
                const isActive = activeTab === p.key;
                const integration = integrations.find((i) => i.provider === p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => { setActiveTab(p.key); setMessage(''); }}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="mr-1.5">{p.icon}</span>
                    {p.label}
                    {integration?.enabled && (
                      <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Provider config form */}
            <div className="space-y-5 px-6 py-5">
              <p className="text-xs text-muted-foreground">
                {PROVIDERS.find((p) => p.key === activeTab)?.description}
              </p>

              {/* Setup instructions */}
              <details className="rounded-md border bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  Hoe stel ik dit in?
                </summary>
                <div className="mt-3 space-y-2">
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
                    {PROVIDERS.find((p) => p.key === activeTab)?.setupHelp}
                  </pre>
                  <a
                    href={PROVIDERS.find((p) => p.key === activeTab)?.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open instellingen
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                </div>
              </details>

              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Integratie inschakelen</p>
                  <p className="text-xs text-muted-foreground">Activeer datasynchronisatie</p>
                </div>
                <button
                  onClick={() => setEditEnabled((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editEnabled[activeTab] ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    editEnabled[activeTab] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Sync frequency */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Synchronisatiefrequentie</label>
                <select
                  value={editSyncFreq[activeTab]}
                  onChange={(e) => setEditSyncFreq((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SYNC_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Campaign name filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Campagnefilter</label>
                <input
                  type="text"
                  value={editCampaignFilter[activeTab] || ''}
                  onChange={(e) => setEditCampaignFilter((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                  placeholder="bijv. polderkroon"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optioneel: alleen campagnes tonen en synchroniseren waarvan de naam dit trefwoord bevat (hoofdletterongevoelig). Leeg = alle campagnes.
                </p>
              </div>

              {/* Credential source selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Credentials</label>

                {/* Google Ads OAuth connect button */}
                {activeTab === 'google_ads' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        window.location.href = `/api/auth/google-ads?site_id=${siteId}`;
                      }}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border-2 border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {setsForProvider.some((s) => s.name.startsWith('Google Ads — '))
                        ? 'Opnieuw koppelen met Google'
                        : 'Koppel Google Ads'}
                    </button>
                    {setsForProvider.some((s) => s.name.startsWith('Google Ads — ')) && (
                      <p className="text-xs text-green-600">
                        ✓ Google Ads account is gekoppeld via OAuth
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
                  {(setsForProvider.length > 0 || currentIntegration?.credential_set_id) && (
                    <button
                      onClick={() => setCredMode((prev) => ({ ...prev, [activeTab]: 'select' }))}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        credMode[activeTab] === 'select' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Bestaande gebruiken
                    </button>
                  )}
                  <button
                    onClick={() => setCredMode((prev) => ({ ...prev, [activeTab]: 'new' }))}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      credMode[activeTab] === 'new' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Nieuwe set aanmaken
                  </button>
                  <button
                    onClick={() => setCredMode((prev) => ({ ...prev, [activeTab]: 'manual' }))}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      credMode[activeTab] === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Alleen deze site
                  </button>
                </div>

                {/* Mode: select existing credential set */}
                {credMode[activeTab] === 'select' && (
                  <div className="space-y-2">
                    {setsForProvider.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Geen opgeslagen credential sets gevonden voor {PROVIDERS.find((p) => p.key === activeTab)?.label}. Maak eerst een nieuwe set aan.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Selecteer een eerder opgeslagen credential set om te hergebruiken voor deze site.
                        </p>
                        <select
                          value={selectedSetId[activeTab]}
                          onChange={(e) => setSelectedSetId((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">— Selecteer een credential set —</option>
                          {setsForProvider.map((set) => (
                            <option key={set.id} value={set.id}>{set.name}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {/* Show extra per-site fields (e.g. customer_id for Google Ads) when using a credential set */}
                    {CREDENTIAL_FIELDS[activeTab].length > 0 && (
                      <div className="space-y-3 border-t pt-3 mt-2">
                        <p className="text-xs text-muted-foreground">Vul de onderstaande velden aan voor deze site:</p>
                        {CREDENTIAL_FIELDS[activeTab].map((field) => {
                          // For Google Ads customer_id, show a dropdown if accessible accounts are available
                          const selectedSet = credentialSets.find((s) => s.id === selectedSetId[activeTab]);
                          const accessibleAccounts = selectedSet?.credentials?.accessible_accounts as Array<{ id: string; name: string; loginCustomerId?: string }> | undefined;
                          const accessibleIds = selectedSet?.credentials?.accessible_customer_ids as string[] | undefined;
                          const hasAccountDropdown = activeTab === 'google_ads' && field.key === 'customer_id' && Array.isArray(accessibleAccounts) && accessibleAccounts.length > 0;
                          const hasIdDropdown = activeTab === 'google_ads' && field.key === 'customer_id' && !hasAccountDropdown && Array.isArray(accessibleIds) && accessibleIds.length > 0;
                          // Hide login_customer_id field when using account dropdown (auto-filled from selected account)
                          const hideField = activeTab === 'google_ads' && field.key === 'login_customer_id' && hasAccountDropdown;

                          if (hideField) return null;

                          return (
                            <div key={field.key}>
                              <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
                              {hasAccountDropdown ? (
                                <select
                                  value={editCredentials[activeTab][field.key] || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const account = accessibleAccounts!.find((a) => a.id === selectedId);
                                    setEditCredentials((prev) => ({
                                      ...prev,
                                      [activeTab]: {
                                        ...prev[activeTab],
                                        [field.key]: selectedId,
                                        // Auto-set login_customer_id when selecting a client under an MCC
                                        login_customer_id: account?.loginCustomerId || '',
                                      },
                                    }));
                                  }}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  <option value="">— Selecteer een klantaccount —</option>
                                  {accessibleAccounts!.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.name} ({acc.id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')})
                                      {acc.loginCustomerId ? ' — via MCC' : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : hasIdDropdown ? (
                                <select
                                  value={editCredentials[activeTab][field.key] || ''}
                                  onChange={(e) =>
                                    setEditCredentials((prev) => ({
                                      ...prev,
                                      [activeTab]: { ...prev[activeTab], [field.key]: e.target.value },
                                    }))
                                  }
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  <option value="">— Selecteer een Klant-ID —</option>
                                  {accessibleIds!.map((id: string) => (
                                    <option key={id} value={id}>
                                      {id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type || 'text'}
                                  value={editCredentials[activeTab][field.key] || ''}
                                  onChange={(e) => {
                                    let val = e.target.value;
                                    // Validate Google Ads customer_id format on input
                                    if (activeTab === 'google_ads' && (field.key === 'customer_id' || field.key === 'login_customer_id')) {
                                      val = val.replace(/[^0-9-]/g, '');
                                    }
                                    setEditCredentials((prev) => ({
                                      ...prev,
                                      [activeTab]: { ...prev[activeTab], [field.key]: val },
                                    }));
                                  }}
                                  placeholder={field.placeholder}
                                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                              )}
                              {activeTab === 'google_ads' && field.key === 'customer_id' && editCredentials[activeTab][field.key] && !/^[\d-]+$/.test(editCredentials[activeTab][field.key]) && (
                                <p className="mt-1 text-xs text-red-500">Klant-ID moet numeriek zijn (bijv. 123-456-7890)</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: new credential set */}
                {credMode[activeTab] === 'new' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Maak een nieuwe credential set aan die je kunt hergebruiken op andere sites.
                    </p>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Naam voor deze credential set</label>
                      <input
                        type="text"
                        value={newSetName[activeTab] || ''}
                        onChange={(e) => setNewSetName((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                        placeholder={`bijv. "Mijn ${PROVIDERS.find((p) => p.key === activeTab)?.label} account"`}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    {CREDENTIAL_FIELDS[activeTab].map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
                        <input
                          type={field.type || 'text'}
                          value={editCredentials[activeTab][field.key] || ''}
                          onChange={(e) =>
                            setEditCredentials((prev) => ({
                              ...prev,
                              [activeTab]: { ...prev[activeTab], [field.key]: e.target.value },
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Mode: manual (site-specific credentials) */}
                {credMode[activeTab] === 'manual' && (
                  <div className="space-y-3">
                    {currentIntegration && !currentIntegration.credential_set_id && (
                      <p className="text-xs text-muted-foreground">
                        Credentials zijn opgeslagen voor deze site. Laat velden leeg om bestaande te behouden.
                      </p>
                    )}
                    {CREDENTIAL_FIELDS[activeTab].map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
                        <input
                          type={field.type || 'text'}
                          value={editCredentials[activeTab][field.key] || ''}
                          onChange={(e) =>
                            setEditCredentials((prev) => ({
                              ...prev,
                              [activeTab]: { ...prev[activeTab], [field.key]: e.target.value },
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status info */}
              {currentIntegration && (
                <div className="rounded-md border bg-muted/50 p-3 text-xs space-y-1">
                  {currentIntegration.credential_set_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credential set:</span>
                      <span className="font-medium">
                        {(currentIntegration as unknown as { credential_set?: { name: string } }).credential_set?.name || 'Gekoppeld'}
                      </span>
                    </div>
                  )}
                  {currentIntegration.campaign_filter && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campagnefilter:</span>
                      <span className="font-medium">&quot;{currentIntegration.campaign_filter}&quot;</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={
                      currentIntegration.last_sync_status === 'success'
                        ? 'text-green-600'
                        : currentIntegration.last_sync_status === 'error'
                        ? 'text-red-600'
                        : currentIntegration.last_sync_status === 'syncing'
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                    }>
                      {currentIntegration.last_sync_status === 'success' && '✓ Gesynchroniseerd'}
                      {currentIntegration.last_sync_status === 'error' && '✗ Fout'}
                      {currentIntegration.last_sync_status === 'syncing' && '⟳ Bezig...'}
                      {!currentIntegration.last_sync_status && 'Nog niet gesynchroniseerd'}
                    </span>
                  </div>
                  {currentIntegration.last_synced_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Laatste sync:</span>
                      <span>{new Date(currentIntegration.last_synced_at).toLocaleString('nl-NL')}</span>
                    </div>
                  )}
                  {currentIntegration.last_sync_error && (
                    <div className="mt-1 text-red-600">
                      Fout: {currentIntegration.last_sync_error}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSave(activeTab)}
                  disabled={saving}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>

                {currentIntegration?.enabled && (
                  <button
                    onClick={() => handleSync(activeTab)}
                    disabled={syncing === activeTab}
                    className="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {syncing === activeTab ? 'Synchroniseren...' : 'Nu synchroniseren'}
                  </button>
                )}

                {currentIntegration && (
                  <button
                    onClick={() => handleDelete(currentIntegration.id)}
                    className="inline-flex h-9 items-center rounded-md px-4 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Verwijderen
                  </button>
                )}

                {message && (
                  <span className="text-sm text-green-600">{message}</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Credential sets management */}
        {!loading && credentialSets.length > 0 && (
          <details className="border-t px-6 py-4">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
              Opgeslagen credential sets beheren ({credentialSets.length})
            </summary>
            <div className="mt-3 space-y-3">
              {credentialSets.map((set) => {
                const providerInfo = PROVIDERS.find((p) => p.key === set.provider);
                return (
                  <div key={set.id} className="flex items-start justify-between rounded-md border bg-muted/30 p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        <span className="mr-1">{providerInfo?.icon}</span>
                        {set.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {providerInfo?.label} &middot; Aangemaakt {new Date(set.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`Credential set "${set.name}" verwijderen? Gekoppelde integraties worden ontkoppeld.`)) return;
                        try {
                          await api.delete(`/api/credential-sets?id=${set.id}`);
                          setMessage('Credential set verwijderd.');
                          fetchAll();
                        } catch {
                          setMessage('Verwijderen mislukt.');
                        }
                      }}
                      className="ml-2 text-xs text-red-600 hover:underline"
                    >
                      Verwijderen
                    </button>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
