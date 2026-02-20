'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FunnelStep {
  name: string;
  type: string;
  match?: string;
  value?: string;
  event_name?: string;
  form_id?: string;
}

export default function NewFunnelPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<FunnelStep[]>([
    { name: 'Stap 1', type: 'page_visit', value: '' },
    { name: 'Stap 2', type: 'page_visit', value: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const addStep = () => {
    setSteps([...steps, { name: `Stap ${steps.length + 1}`, type: 'page_visit', value: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<FunnelStep>) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/funnels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: siteId,
        name,
        description: description || null,
        steps,
      }),
    });

    if (res.ok) {
      router.push(`/dashboard/${siteId}/funnels`);
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funnel aanmaken</h1>
        <p className="text-sm text-muted-foreground">Definieer een meerstaps-conversiefunnel</p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Funnelnaam</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Purchase Flow"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Beschrijving (optioneel)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tracks the full purchase journey"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Stappen</label>
          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Stap {i + 1}</span>
                {steps.length > 2 && (
                  <button
                    onClick={() => removeStep(i)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
              <input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(i, { name: e.target.value })}
                placeholder="Stapnaam"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <select
                value={step.type}
                onChange={(e) => updateStep(i, { type: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="page_visit">Paginabezoek</option>
                <option value="event">Aangepast event</option>
                <option value="form_submit">Formulierinzending</option>
              </select>
              {step.type === 'page_visit' && (
                <input
                  type="text"
                  value={step.value || ''}
                  onChange={(e) => updateStep(i, { value: e.target.value })}
                  placeholder="/pricing"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              )}
              {step.type === 'event' && (
                <input
                  type="text"
                  value={step.event_name || ''}
                  onChange={(e) => updateStep(i, { event_name: e.target.value })}
                  placeholder="Event name (e.g., add_to_cart)"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              )}
              {step.type === 'form_submit' && (
                <input
                  type="text"
                  value={step.form_id || ''}
                  onChange={(e) => updateStep(i, { form_id: e.target.value })}
                  placeholder="Form ID"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}

          <button
            onClick={addStep}
            className="w-full rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            + Stap toevoegen
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!name || steps.length < 2 || saving}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Aanmaken...' : 'Funnel aanmaken'}
        </button>
      </div>
    </div>
  );
}
