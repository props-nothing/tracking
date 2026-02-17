/**
 * Form submission + abandonment + field interaction tracking
 */
import { EventPayload } from './collect';

const SENSITIVE_TYPES = new Set(['password', 'hidden']);
const SENSITIVE_NAMES = /credit_card|card_number|cvv|ssn|password|secret|cc_number|card_exp|security_code/i;

interface FieldMeta {
  name: string;
  type: string;
  filled: boolean;
  time_ms: number;
  had_error: boolean;
}

export function trackForms(
  onEvent: (payload: Partial<EventPayload>) => void
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

  function isSensitive(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
    if (field.hasAttribute('data-no-track')) return true;
    if (field instanceof HTMLInputElement && SENSITIVE_TYPES.has(field.type)) return true;
    if (SENSITIVE_NAMES.test(field.name || '')) return true;
    return false;
  }

  function getFieldMeta(form: HTMLFormElement, state: ReturnType<typeof getState>): FieldMeta[] {
    const fields: FieldMeta[] = [];
    const elements = form.elements;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLInputElement;
      if (isSensitive(el)) continue;
      if (!el.name && !el.id) continue;
      if (el.type === 'submit' || el.type === 'button') continue;

      const name = el.name || el.id;
      fields.push({
        name,
        type: el.type || 'text',
        filled: !!el.value,
        time_ms: state.fieldTimes.get(name) || 0,
        had_error: !el.validity?.valid,
      });
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
      const fields = getFieldMeta(form, state);

      onEvent({
        event_type: 'form_submit',
        event_name: 'form_submit',
        form_id: formId,
        form_action: form.action || null,
        form_fields: fields,
        form_last_field: state.lastField || null,
        form_time_to_submit_ms: state.startTime ? Date.now() - state.startTime : null,
      });

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
        const fields = getFieldMeta(f, state);
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
