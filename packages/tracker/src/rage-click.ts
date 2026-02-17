/**
 * Rage click detection — 3+ clicks within 1 second on the same area
 */
import { EventPayload } from './collect';

export function trackRageClicks(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  const clicks: { x: number; y: number; ts: number }[] = [];
  const THRESHOLD = 3;
  const WINDOW_MS = 1000;
  const PROXIMITY_PX = 30;
  let lastRageTs = 0;

  document.addEventListener('click', (e) => {
    const now = Date.now();
    clicks.push({ x: e.clientX, y: e.clientY, ts: now });

    // Clean old clicks
    while (clicks.length > 0 && now - clicks[0].ts > WINDOW_MS) {
      clicks.shift();
    }

    if (clicks.length >= THRESHOLD) {
      // Check if all clicks are near each other
      const first = clicks[0];
      const allNear = clicks.every(
        (c) => Math.abs(c.x - first.x) < PROXIMITY_PX && Math.abs(c.y - first.y) < PROXIMITY_PX
      );

      if (allNear && now - lastRageTs > WINDOW_MS) {
        lastRageTs = now;
        const target = e.target as HTMLElement;
        onEvent({
          event_type: 'rage_click',
          event_name: 'rage_click',
          event_data: {
            x: e.clientX,
            y: e.clientY,
            element_tag: target.tagName?.toLowerCase(),
            element_id: target.id || null,
            element_class: target.className?.toString().slice(0, 100) || null,
            element_text: (target.textContent || '').trim().slice(0, 100) || null,
            click_count: clicks.length,
          },
        });
      }
    }
  });
}
