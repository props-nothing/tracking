/**
 * Outbound link click handler — fires events before navigation
 */
import { EventPayload } from './collect';

export function trackOutbound(
  hostname: string,
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    try {
      const url = new URL(href, window.location.href);
      // Only track links to different hostnames
      if (url.hostname && url.hostname !== hostname && url.protocol.startsWith('http')) {
        onEvent({
          event_type: 'outbound_click',
          event_name: 'outbound_click',
          event_data: {
            url: url.href,
            hostname: url.hostname,
            text: (link.textContent || '').trim().slice(0, 200),
          },
        });
      }
    } catch { /* invalid URL, ignore */ }
  }, { capture: true });
}
