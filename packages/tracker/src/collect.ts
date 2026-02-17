/**
 * Beacon / fetch sender — sends events to the collect endpoint
 *
 * Strategy: use fetch for standard events (more reliable, supports response),
 * use sendBeacon only as fallback or for unload events via sendBeacon().
 */
import { debug as log } from './utils';

export type EventPayload = Record<string, any>;

let debugMode = false;

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

export function sendEvent(apiUrl: string, payload: EventPayload): void {
  const body = JSON.stringify(payload);

  log(debugMode, 'Sending event:', payload.event_type, payload);

  // Prefer fetch for standard events — more reliable and supports response handling
  try {
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* silently fail */ });
  } catch {
    // Fallback to sendBeacon if fetch throws
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(apiUrl, blob);
    }
  }
}

export function sendBeacon(apiUrl: string, payload: EventPayload): void {
  const body = JSON.stringify(payload);
  log(debugMode, 'Beacon:', payload.event_type, payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(apiUrl, new Blob([body], { type: 'application/json' }));
    }
  } catch { /* ignore */ }
}
