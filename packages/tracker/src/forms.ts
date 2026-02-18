/**
 * Form submission + abandonment + field interaction tracking
 * Supports capturing field values for lead tracking (opt-in via data-capture-leads)
 */
import { EventPayload } from './collect';

const SENSITIVE_TYPES = new Set(['password', 'hidden']);
const SENSITIVE_NAMES = /credit_card|card_number|cvv|ssn|password|secret|cc_number|card_exp|security_code/i;

/** Well-known field names mapped to lead properties */
const LEAD_NAME_PATTERNS = /^(name|full[_-]?name|your[_-]?name|customer[_-]?name|contact[_-]?name|naam|volledige[_-]?naam)$/i;
const LEAD_FIRST_NAME_PATTERNS = /^(first[_-]?name|fname|voornaam|given[_-]?name)$/i;
const LEAD_LAST_NAME_PATTERNS = /^(last[_-]?name|lname|surname|achternaam|family[_-]?name)$/i;
const LEAD_EMAIL_PATTERNS = /^(email|e[_-]?mail|email[_-]?address|your[_-]?email)$/i;
const LEAD_PHONE_PATTERNS = /^(phone|tel|telephone|phone[_-]?number|mobile|telefoon|telefon)$/i;
const LEAD_COMPANY_PATTERNS = /^(company|organization|organisation|bedrijf|bedrijfsnaam|company[_-]?name)$/i;
const LEAD_MESSAGE_PATTERNS = /^(message|comment|comments|bericht|opmerking|notes|beschrijving|description)$/i;

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
}

function extractLeadData(form: HTMLFormElement): LeadData {
  const lead: LeadData = {
    lead_name: null,
    lead_email: null,
    lead_phone: null,
    lead_company: null,
    lead_message: null,
  };

  let firstName = '';
  let lastName = '';

  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = (el.name || el.id || '').trim();
    const val = (el.value || '').trim();
    if (!name || !val) continue;

    // Also check input type for email/tel
    if (el instanceof HTMLInputElement && el.type === 'email' && !lead.lead_email) {
      lead.lead_email = val;
      continue;
    }
    if (el instanceof HTMLInputElement && el.type === 'tel' && !lead.lead_phone) {
      lead.lead_phone = val;
      continue;
    }

    if (LEAD_NAME_PATTERNS.test(name)) lead.lead_name = val;
    else if (LEAD_FIRST_NAME_PATTERNS.test(name)) firstName = val;
    else if (LEAD_LAST_NAME_PATTERNS.test(name)) lastName = val;
    else if (LEAD_EMAIL_PATTERNS.test(name) && !lead.lead_email) lead.lead_email = val;
    else if (LEAD_PHONE_PATTERNS.test(name) && !lead.lead_phone) lead.lead_phone = val;
    else if (LEAD_COMPANY_PATTERNS.test(name)) lead.lead_company = val;
    else if (LEAD_MESSAGE_PATTERNS.test(name)) lead.lead_message = val;
  }

  // Combine first + last if no full name
  if (!lead.lead_name && (firstName || lastName)) {
    lead.lead_name = [firstName, lastName].filter(Boolean).join(' ');
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

      // Extract lead data from well-known form fields
      if (capture) {
        const lead = extractLeadData(form);
        payload.lead_name = lead.lead_name;
        payload.lead_email = lead.lead_email;
        payload.lead_phone = lead.lead_phone;
        payload.lead_company = lead.lead_company;
        payload.lead_message = lead.lead_message;
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
