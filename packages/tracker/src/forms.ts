/**
 * Form submission + abandonment + field interaction tracking
 * Supports capturing field values for lead tracking (opt-in via data-capture-leads)
 *
 * Field detection uses multiple signals per field (label text, aria-label,
 * placeholder, autocomplete, data-name, name, id) so it works reliably with
 * form builders like Fluent Forms that use generic name attributes.
 */
import { EventPayload } from './collect';

const SENSITIVE_TYPES = new Set(['password', 'hidden']);
const SENSITIVE_NAMES = /credit_card|card_number|cvv|ssn|password|secret|cc_number|card_exp|security_code/i;

/* ------------------------------------------------------------------ */
/*  Signal-based field classification                                 */
/* ------------------------------------------------------------------ */

type LeadField = 'lead_email' | 'lead_phone' | 'lead_name' | 'first_name' | 'last_name' | 'lead_company' | 'lead_message';

interface FieldRule {
  field: LeadField;
  /** Match on input type (definitive — checked first) */
  types?: string[];
  /** Match on autocomplete attribute (standardised — checked second) */
  autocompletes?: string[];
  /** Regex tested against every text signal on the field */
  pattern: RegExp;
}

/**
 * Rules are ordered by specificity: first_name / last_name before lead_name
 * so "Voornaam" is not accidentally classified as a generic name field.
 */
const FIELD_RULES: FieldRule[] = [
  {
    field: 'lead_email',
    types: ['email'],
    autocompletes: ['email'],
    pattern: /e[-_]?mail|emailadres|e-mailadres/i,
  },
  {
    field: 'lead_phone',
    types: ['tel'],
    autocompletes: ['tel', 'tel-national', 'tel-local'],
    pattern: /phone|tel(?:efoon|efon)?|mobile|mobiel|gsm/i,
  },
  {
    field: 'first_name',
    autocompletes: ['given-name'],
    pattern: /first[-_]?name|fname|voornaam|given[-_]?name|prénom/i,
  },
  {
    field: 'last_name',
    autocompletes: ['family-name'],
    pattern: /last[-_]?name|lname|surname|achternaam|family[-_]?name/i,
  },
  {
    field: 'lead_name',
    autocompletes: ['name'],
    // \b prevents matching inside "voornaam" or "achternaam"
    pattern: /\b(name|full[-_]?name|your[-_]?name|customer[-_]?name|contact[-_]?name|naam|volledige[-_]?naam)\b/i,
  },
  {
    field: 'lead_company',
    autocompletes: ['organization'],
    pattern: /company|organi[sz]ation|bedrijf|bedrijfsnaam/i,
  },
  {
    field: 'lead_message',
    pattern: /message|comment|bericht|opmerking|notes|beschrijving|description|vraag/i,
  },
];

/**
 * Collect every available text hint for a form field so we can classify it
 * even when the name attribute is generic (e.g. Fluent Forms "input_text").
 */
function getFieldSignals(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] {
  const s: string[] = [];

  // name – also extract inner part from bracket notation e.g. names[first_name]
  if (el.name) {
    s.push(el.name);
    const brackets = el.name.match(/\[([^\]]+)\]/g);
    if (brackets) brackets.forEach(b => s.push(b.replace(/[[\]]/g, '')));
  }

  if (el.id) s.push(el.id);

  // data-name (Fluent Forms, WPForms, etc.)
  const dataName = el.getAttribute('data-name');
  if (dataName) s.push(dataName);

  // placeholder
  if ('placeholder' in el && (el as HTMLInputElement).placeholder) {
    s.push((el as HTMLInputElement).placeholder);
  }

  // aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) s.push(ariaLabel);

  // autocomplete
  const ac = el.getAttribute('autocomplete');
  if (ac) s.push(ac);

  // Associated <label> by for=id
  if (el.id) {
    try {
      const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(el.id) : el.id;
      const label = document.querySelector(`label[for="${esc}"]`);
      if (label) s.push((label.textContent || '').trim());
    } catch { /* ignore */ }
  }

  // <label> as ancestor
  try {
    const parentLabel = el.closest?.('label');
    if (parentLabel) s.push((parentLabel.textContent || '').trim());
  } catch { /* ignore */ }

  return s.filter(Boolean);
}

/** Classify a field using input type → autocomplete → text signals */
function classifyField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): LeadField | null {
  const type = el instanceof HTMLInputElement ? el.type : '';
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  const signals = getFieldSignals(el);

  for (const rule of FIELD_RULES) {
    // 1. Definitive: input type
    if (rule.types?.includes(type)) return rule.field;
    // 2. Standardised: autocomplete attribute
    if (rule.autocompletes && ac && rule.autocompletes.includes(ac)) return rule.field;
    // 3. Heuristic: test every collected text signal
    if (signals.some(sig => rule.pattern.test(sig))) return rule.field;
  }

  // Un-matched <textarea> → likely a message / comment box
  if (el.tagName.toLowerCase() === 'textarea') return 'lead_message';

  return null;
}

/* ------------------------------------------------------------------ */
/*  Lead data extraction                                              */
/* ------------------------------------------------------------------ */

interface FieldMeta {
  name: string;
  type: string;
  filled: boolean;
  time_ms: number;
  had_error: boolean;
  value?: string;
}

interface LeadData {
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_company: string | null;
  lead_message: string | null;
  lead_data: Record<string, string> | null;
}

/**
 * Get a human-readable label for a form field.
 * Tries: label text > aria-label > placeholder > data-name > name > id.
 */
function getFieldLabel(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  // Associated <label> by for=id
  if (el.id) {
    try {
      const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(el.id) : el.id;
      const label = document.querySelector(`label[for="${esc}"]`);
      if (label) {
        const txt = (label.textContent || '').trim();
        if (txt) return txt;
      }
    } catch { /* ignore */ }
  }
  // Parent <label>
  try {
    const parentLabel = el.closest?.('label');
    if (parentLabel) {
      const txt = (parentLabel.textContent || '').trim();
      if (txt) return txt;
    }
  } catch { /* ignore */ }

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  if ('placeholder' in el && (el as HTMLInputElement).placeholder) {
    return (el as HTMLInputElement).placeholder;
  }

  return el.getAttribute('data-name') || el.name || el.id || 'unknown';
}

/**
 * Collect ALL form field values as a flat label→value map.
 * Skips: submit/button, password, sensitive patterns, GDPR checkboxes, nonces.
 * Includes checked checkboxes/radios, selects, textareas, hidden UTM fields, etc.
 */
function extractAllFormData(form: HTMLFormElement): Record<string, string> {
  const data: Record<string, string> = {};
  const SKIP_HIDDEN_NAMES = /nonce|_wp_http_referer|__fluent_form|_token|csrf|honeypot/i;

  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (!el.name && !el.id) continue;
    if (el.type === 'submit' || el.type === 'button') continue;
    if (el.type === 'password') continue;
    if (SENSITIVE_NAMES.test(el.name || '')) continue;
    if (el.hasAttribute('data-no-track')) continue;

    // Skip WordPress/plugin nonce/referer hidden fields
    if (el.type === 'hidden' && SKIP_HIDDEN_NAMES.test(el.name || '')) continue;

    const key = getFieldLabel(el);

    // Checkboxes & radios: only capture if checked, group values
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (!el.checked) continue;
      const val = el.value || 'on';
      // Accumulate multiple checked checkboxes with same label-group
      if (data[key]) {
        data[key] += `, ${val}`;
      } else {
        data[key] = val;
      }
      continue;
    }

    const val = (el.value || '').trim();
    if (!val) continue;

    // For hidden fields (like UTMs), use name as key since there's no label
    if (el.type === 'hidden') {
      data[el.name] = val.slice(0, 500);
    } else {
      data[key] = val.slice(0, 500);
    }
  }

  return data;
}

function extractLeadData(form: HTMLFormElement): LeadData {
  const lead: LeadData = {
    lead_name: null,
    lead_email: null,
    lead_phone: null,
    lead_company: null,
    lead_message: null,
    lead_data: null,
  };

  let firstName = '';
  let lastName = '';

  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    // Skip non-value elements
    if (el instanceof HTMLInputElement && (el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio')) continue;
    if (el.type === 'submit' || el.type === 'button') continue;

    const val = (el.value || '').trim();
    if (!val) continue;

    const field = classifyField(el);
    if (!field) continue;

    switch (field) {
      case 'lead_email':   if (!lead.lead_email) lead.lead_email = val; break;
      case 'lead_phone':   if (!lead.lead_phone) lead.lead_phone = val; break;
      case 'lead_name':    if (!lead.lead_name) lead.lead_name = val; break;
      case 'first_name':   if (!firstName) firstName = val; break;
      case 'last_name':    if (!lastName) lastName = val; break;
      case 'lead_company': if (!lead.lead_company) lead.lead_company = val; break;
      case 'lead_message': if (!lead.lead_message) lead.lead_message = val; break;
    }
  }

  // Combine first + last when no full-name field was found
  if (!lead.lead_name && (firstName || lastName)) {
    lead.lead_name = [firstName, lastName].filter(Boolean).join(' ');
  }

  // Capture ALL form data as a flat key→value map
  const allData = extractAllFormData(form);
  if (Object.keys(allData).length > 0) {
    lead.lead_data = allData;
  }

  return lead;
}

export function trackForms(
  onEvent: (payload: Partial<EventPayload>) => void,
  captureLeads: boolean = false
): void {
  const formStates = new WeakMap<HTMLFormElement, {
    started: boolean;
    startTime: number;
    fieldTimes: Map<string, number>;
    fieldFocusStart: Map<string, number>;
    lastField: string;
  }>();

  function getFormId(form: HTMLFormElement): string {
    return form.id || form.getAttribute('name') || `form-${Array.from(document.forms).indexOf(form)}`;
  }

  function shouldCaptureLeads(form: HTMLFormElement): boolean {
    // Per-form opt-in/opt-out overrides global setting
    const formAttr = form.getAttribute('data-capture-leads');
    if (formAttr === 'true') return true;
    if (formAttr === 'false') return false;
    return captureLeads;
  }

  function isSensitive(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
    if (field.hasAttribute('data-no-track')) return true;
    if (field instanceof HTMLInputElement && SENSITIVE_TYPES.has(field.type)) return true;
    if (SENSITIVE_NAMES.test(field.name || '')) return true;
    return false;
  }

  function getFieldMeta(form: HTMLFormElement, state: ReturnType<typeof getState>, includeValues: boolean): FieldMeta[] {
    const fields: FieldMeta[] = [];
    const elements = form.elements;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLInputElement;
      if (isSensitive(el)) continue;
      if (!el.name && !el.id) continue;
      if (el.type === 'submit' || el.type === 'button') continue;

      const name = el.name || el.id;
      const meta: FieldMeta = {
        name,
        type: el.type || 'text',
        filled: !!el.value,
        time_ms: state.fieldTimes.get(name) || 0,
        had_error: !el.validity?.valid,
      };

      // Include values when lead capture is enabled (except sensitive fields already filtered)
      if (includeValues && el.value) {
        meta.value = el.value.slice(0, 500); // Cap value length
      }

      fields.push(meta);
    }
    return fields;
  }

  function getState(form: HTMLFormElement) {
    if (!formStates.has(form)) {
      formStates.set(form, {
        started: false,
        startTime: 0,
        fieldTimes: new Map(),
        fieldFocusStart: new Map(),
        lastField: '',
      });
    }
    return formStates.get(form)!;
  }

  // Attach listeners to all forms
  function attachToForm(form: HTMLFormElement) {
    const formId = getFormId(form);

    // Focus tracking per field
    form.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (!('name' in target)) return;
      const field = target as HTMLInputElement;
      if (isSensitive(field)) return;

      const state = getState(form);
      if (!state.started) {
        state.started = true;
        state.startTime = Date.now();
      }
      const name = field.name || field.id;
      state.fieldFocusStart.set(name, Date.now());
      state.lastField = name;
    });

    form.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement;
      if (!('name' in target)) return;
      const field = target as HTMLInputElement;
      if (isSensitive(field)) return;

      const state = getState(form);
      const name = field.name || field.id;
      const focusStart = state.fieldFocusStart.get(name);
      if (focusStart) {
        const existing = state.fieldTimes.get(name) || 0;
        state.fieldTimes.set(name, existing + (Date.now() - focusStart));
        state.fieldFocusStart.delete(name);
      }
    });

    // Submit
    form.addEventListener('submit', () => {
      const state = getState(form);
      const capture = shouldCaptureLeads(form);
      const fields = getFieldMeta(form, state, capture);

      const payload: Partial<EventPayload> = {
        event_type: 'form_submit',
        event_name: 'form_submit',
        form_id: formId,
        form_action: form.action || null,
        form_fields: fields,
        form_last_field: state.lastField || null,
        form_time_to_submit_ms: state.startTime ? Date.now() - state.startTime : null,
      };

      // Extract lead data from well-known form fields + all form data
      if (capture) {
        const lead = extractLeadData(form);
        payload.lead_name = lead.lead_name;
        payload.lead_email = lead.lead_email;
        payload.lead_phone = lead.lead_phone;
        payload.lead_company = lead.lead_company;
        payload.lead_message = lead.lead_message;
        payload.lead_data = lead.lead_data;
      }

      onEvent(payload);

      // Reset state
      formStates.delete(form);
    });
  }

  // Attach to existing forms
  document.querySelectorAll('form').forEach((f) => attachToForm(f as HTMLFormElement));

  // Watch for dynamically added forms
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLFormElement) {
            attachToForm(node);
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll('form').forEach((f) => attachToForm(f as HTMLFormElement));
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Form abandonment on beforeunload
  window.addEventListener('beforeunload', () => {
    document.querySelectorAll('form').forEach((form) => {
      const f = form as HTMLFormElement;
      const state = formStates.get(f);
      if (state?.started) {
        const fields = getFieldMeta(f, state, false); // Never capture values on abandon
        const hasFilledField = fields.some((fld) => fld.filled);
        if (hasFilledField) {
          onEvent({
            event_type: 'form_abandon',
            event_name: 'form_abandon',
            form_id: getFormId(f),
            form_action: f.action || null,
            form_fields: fields,
            form_last_field: state.lastField || null,
            form_time_to_submit_ms: state.startTime ? Date.now() - state.startTime : null,
          });
        }
      }
    });
  });
}
