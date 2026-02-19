'use client';

import { useState, useEffect } from 'react';

interface AIConfigModalProps {
  siteId: string;
  open: boolean;
  onClose: () => void;
}

interface AIConfigData {
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'manual';
  schedule_hour: number;
  custom_prompt: string;
  included_sections: string[];
  comparison_enabled: boolean;
  comparison_period: 'previous_period' | 'previous_month' | 'previous_year';
  openai_model: string;
  max_tokens: number;
}

const ALL_SECTIONS = [
  { key: 'traffic', label: 'Traffic Overview' },
  { key: 'leads', label: 'Lead Analysis' },
  { key: 'campaigns', label: 'Campaign Performance' },
  { key: 'goals', label: 'Goal Conversions' },
  { key: 'pages', label: 'Page Performance' },
  { key: 'geo', label: 'Geographic Data' },
  { key: 'devices', label: 'Device Breakdown' },
  { key: 'ecommerce', label: 'E-commerce' },
  { key: 'performance', label: 'Web Vitals' },
];

const MODELS = [
  { value: 'gpt-5.2-2025-12-11', label: 'GPT-5.2 (Latest)' },
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini (Faster)' },
  { value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano (Cheapest)' },
  { value: 'o3-2025-04-16', label: 'o3 (Reasoning)' },
];

export function AIConfigModal({ siteId, open, onClose }: AIConfigModalProps) {
  const [config, setConfig] = useState<AIConfigData>({
    enabled: false,
    schedule: 'manual',
    schedule_hour: 8,
    custom_prompt: '',
    included_sections: ['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
    comparison_enabled: true,
    comparison_period: 'previous_period',
    openai_model: 'gpt-5.2-2025-12-11',
    max_tokens: 3000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !siteId) return;
    setLoading(true);
    fetch(`/api/ai-config?site_id=${siteId}`)
      .then(res => res.json())
      .then(data => {
        setConfig({
          enabled: data.enabled ?? false,
          schedule: data.schedule ?? 'manual',
          schedule_hour: data.schedule_hour ?? 8,
          custom_prompt: data.custom_prompt ?? '',
          included_sections: data.included_sections ?? ['traffic', 'leads', 'campaigns', 'goals', 'pages', 'geo', 'devices'],
          comparison_enabled: data.comparison_enabled ?? true,
          comparison_period: data.comparison_period ?? 'previous_period',
          openai_model: data.openai_model ?? 'gpt-5.2-2025-12-11',
          max_tokens: data.max_tokens ?? 3000,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, siteId]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, ...config }),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save AI config:', err);
    }
    setSaving(false);
  }

  function toggleSection(key: string) {
    setConfig(prev => ({
      ...prev,
      included_sections: prev.included_sections.includes(key)
        ? prev.included_sections.filter(s => s !== key)
        : [...prev.included_sections, key],
    }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">AI Insights Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading settings...</div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable AI Insights</p>
                <p className="text-xs text-muted-foreground">Automatically analyze your analytics data</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule</label>
              <select
                value={config.schedule}
                onChange={e => setConfig(prev => ({ ...prev, schedule: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="manual">Manual only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Mondays)</option>
              </select>
              {config.schedule !== 'manual' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Run at hour:</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={config.schedule_hour}
                    onChange={e => setConfig(prev => ({ ...prev, schedule_hour: parseInt(e.target.value) || 8 }))}
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">(0-23, in site timezone)</span>
                </div>
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Model</label>
              <select
                value={config.openai_model}
                onChange={e => setConfig(prev => ({ ...prev, openai_model: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Comparison */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Period Comparison</p>
                  <p className="text-xs text-muted-foreground">Compare with a previous period</p>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, comparison_enabled: !prev.comparison_enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.comparison_enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    config.comparison_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {config.comparison_enabled && (
                <select
                  value={config.comparison_period}
                  onChange={e => setConfig(prev => ({ ...prev, comparison_period: e.target.value as any }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="previous_period">Previous period</option>
                  <option value="previous_month">Previous month</option>
                  <option value="previous_year">Previous year</option>
                </select>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Sections to Analyze</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SECTIONS.map(s => (
                  <label key={s.key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.included_sections.includes(s.key)}
                      onChange={() => toggleSection(s.key)}
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Instructions</label>
              <textarea
                value={config.custom_prompt}
                onChange={e => setConfig(prev => ({ ...prev, custom_prompt: e.target.value }))}
                placeholder="E.g., Focus on B2B SaaS leads from LinkedIn. Ignore direct traffic. Our main goal is demo signups."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                These instructions are appended to the AI prompt to customize the analysis for your business.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
