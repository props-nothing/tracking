'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOAL_TYPES = [
  { value: 'page_visit', label: 'Paginabezoek', description: 'Trigger wanneer een bezoeker een specifieke pagina bekijkt' },
  { value: 'event', label: 'Aangepast event', description: 'Trigger wanneer een specifiek aangepast event wordt uitgevoerd' },
  { value: 'form_submit', label: 'Formulierinzending', description: 'Trigger wanneer een formulier wordt ingediend' },
  { value: 'scroll_depth', label: 'Scrolldiepte', description: 'Trigger wanneer een bezoeker voorbij X% scrollt' },
  { value: 'time_on_page', label: 'Tijd op pagina', description: 'Trigger wanneer een bezoeker X+ seconden besteedt' },
  { value: 'revenue', label: 'Omzet', description: 'Volg elk aankoopgebeurtenis' },
];

export default function NewGoalPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('page_visit');
  const [conditionValue, setConditionValue] = useState('');
  const [conditionMatch, setConditionMatch] = useState('contains');
  const [eventName, setEventName] = useState('');
  const [formId, setFormId] = useState('');
  const [minPct, setMinPct] = useState(75);
  const [minSeconds, setMinSeconds] = useState(30);
  const [revenueValue, setRevenueValue] = useState('');
  const [countMode, setCountMode] = useState('once_per_session');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    let conditions: unknown[] = [];

    switch (goalType) {
      case 'page_visit':
        conditions = [{ type: 'page_visit', match: conditionMatch, value: conditionValue }];
        break;
      case 'event':
        conditions = [{ type: 'event', event_name: eventName }];
        break;
      case 'form_submit':
        conditions = [{ type: 'form_submit', form_id: formId || undefined }];
        break;
      case 'scroll_depth':
        conditions = [{ type: 'scroll_depth', path: conditionValue || '*', min_pct: minPct }];
        break;
      case 'time_on_page':
        conditions = [{ type: 'time_on_page', path: conditionValue || '*', min_seconds: minSeconds }];
        break;
      case 'revenue':
        conditions = [{ type: 'event', event_name: 'purchase' }];
        break;
    }

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: siteId,
        name,
        goal_type: goalType,
        conditions,
        revenue_value: revenueValue ? parseFloat(revenueValue) : null,
        count_mode: countMode,
      }),
    });

    if (res.ok) {
      router.push(`/dashboard/${siteId}/goals`);
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Doel aanmaken</h1>
        <p className="text-sm text-muted-foreground">Definieer een conversiedoel voor je site</p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Doelnaam</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Viewed Pricing Page"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Doeltype</label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {GOAL_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setGoalType(type.value)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  goalType === type.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Condition fields based on goal type */}
        {goalType === 'page_visit' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Matchtype</label>
              <select
                value={conditionMatch}
                onChange={(e) => setConditionMatch(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="exact">Exacte match</option>
                <option value="contains">Bevat</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Paginapad</label>
              <input
                type="text"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="/pricing"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {goalType === 'event' && (
          <div>
            <label className="text-sm font-medium">Eventnaam</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="signup"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        )}

        {goalType === 'form_submit' && (
          <div>
            <label className="text-sm font-medium">Formulier-ID (optioneel)</label>
            <input
              type="text"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="contact-form"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        )}

        {goalType === 'scroll_depth' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Minimale scroll %</label>
              <input
                type="number"
                value={minPct}
                onChange={(e) => setMinPct(Number(e.target.value))}
                min={1}
                max={100}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Paginapad (optioneel, * voor alles)</label>
              <input
                type="text"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="/blog/*"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {goalType === 'time_on_page' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Minimale seconden</label>
              <input
                type="number"
                value={minSeconds}
                onChange={(e) => setMinSeconds(Number(e.target.value))}
                min={1}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Paginapad</label>
              <input
                type="text"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="/pricing"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Omzetwaarde (optioneel)</label>
            <input
              type="number"
              value={revenueValue}
              onChange={(e) => setRevenueValue(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Telmodus</label>
            <select
              value={countMode}
              onChange={(e) => setCountMode(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="once_per_session">Eén keer per sessie</option>
              <option value="every_time">Elke keer</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name || saving}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Aanmaken...' : 'Doel aanmaken'}
        </button>
      </div>
    </div>
  );
}
