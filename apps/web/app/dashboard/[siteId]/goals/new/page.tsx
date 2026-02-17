'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOAL_TYPES = [
  { value: 'page_visit', label: 'Page Visit', description: 'Trigger when a visitor views a specific page' },
  { value: 'event', label: 'Custom Event', description: 'Trigger when a specific custom event fires' },
  { value: 'form_submit', label: 'Form Submission', description: 'Trigger when a form is submitted' },
  { value: 'scroll_depth', label: 'Scroll Depth', description: 'Trigger when a visitor scrolls past X%' },
  { value: 'time_on_page', label: 'Time on Page', description: 'Trigger when a visitor spends X+ seconds' },
  { value: 'revenue', label: 'Revenue', description: 'Track any purchase event' },
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
        <h1 className="text-2xl font-bold tracking-tight">Create Goal</h1>
        <p className="text-sm text-muted-foreground">Define a conversion goal for your site</p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Goal Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Viewed Pricing Page"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Goal Type</label>
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
              <label className="text-sm font-medium">Match Type</label>
              <select
                value={conditionMatch}
                onChange={(e) => setConditionMatch(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="exact">Exact match</option>
                <option value="contains">Contains</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Page Path</label>
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
            <label className="text-sm font-medium">Event Name</label>
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
            <label className="text-sm font-medium">Form ID (optional)</label>
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
              <label className="text-sm font-medium">Minimum Scroll %</label>
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
              <label className="text-sm font-medium">Page Path (optional, * for all)</label>
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
              <label className="text-sm font-medium">Minimum Seconds</label>
              <input
                type="number"
                value={minSeconds}
                onChange={(e) => setMinSeconds(Number(e.target.value))}
                min={1}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Page Path</label>
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
            <label className="text-sm font-medium">Revenue Value (optional)</label>
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
            <label className="text-sm font-medium">Count Mode</label>
            <select
              value={countMode}
              onChange={(e) => setCountMode(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="once_per_session">Once per session</option>
              <option value="every_time">Every time</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name || saving}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Goal'}
        </button>
      </div>
    </div>
  );
}
