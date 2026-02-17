/**
 * JS error + unhandled rejection tracking
 */
import { EventPayload } from './collect';

export function trackErrors(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  // Only track errors from the same origin (first-party)
  const origin = window.location.origin;

  window.addEventListener('error', (e) => {
    // Skip third-party script errors
    if (e.filename && !e.filename.startsWith(origin)) return;

    onEvent({
      event_type: 'error',
      event_name: 'js_error',
      error_message: e.message || 'Unknown error',
      error_stack: e.error?.stack?.slice(0, 2000) || null,
      error_source: e.filename || null,
      error_line: e.lineno || null,
      error_col: e.colno || null,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    let message = 'Unhandled Promise Rejection';
    let stack: string | null = null;

    if (reason instanceof Error) {
      message = reason.message || message;
      stack = reason.stack?.slice(0, 2000) || null;
    } else if (typeof reason === 'string') {
      message = reason;
    }

    onEvent({
      event_type: 'error',
      event_name: 'unhandled_rejection',
      error_message: message,
      error_stack: stack,
      error_source: null,
      error_line: null,
      error_col: null,
    });
  });
}
