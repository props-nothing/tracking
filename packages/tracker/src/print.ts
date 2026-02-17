/**
 * Print event tracking — fires on window.print() / Ctrl+P
 */
import { EventPayload } from './collect';

export function trackPrint(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  if (typeof window.matchMedia === 'undefined') return;

  let printing = false;

  window.matchMedia('print').addEventListener('change', (e) => {
    if (e.matches && !printing) {
      printing = true;
      onEvent({
        event_type: 'print',
        event_name: 'print',
        event_data: {
          url: window.location.href,
          title: document.title,
        },
      });
      // Reset after a short delay
      setTimeout(() => { printing = false; }, 2000);
    }
  });

  window.addEventListener('beforeprint', () => {
    if (!printing) {
      printing = true;
      onEvent({
        event_type: 'print',
        event_name: 'print',
        event_data: {
          url: window.location.href,
          title: document.title,
        },
      });
      setTimeout(() => { printing = false; }, 2000);
    }
  });
}
