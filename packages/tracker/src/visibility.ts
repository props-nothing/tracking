/**
 * Element visibility tracking — data-track-visibility attribute
 */
import { EventPayload } from './collect';

export function trackVisibility(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  if (typeof IntersectionObserver === 'undefined') return;

  const tracked = new Set<Element>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !tracked.has(entry.target)) {
          tracked.add(entry.target);
          const name = entry.target.getAttribute('data-track-visibility') || '';
          onEvent({
            event_type: 'element_visible',
            event_name: 'element_visible',
            event_data: {
              section: name,
              element_id: entry.target.id || null,
              element_tag: entry.target.tagName.toLowerCase(),
            },
          });
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.5 }
  );

  // Observe elements with data-track-visibility
  function observeElements() {
    document.querySelectorAll('[data-track-visibility]').forEach((el) => {
      if (!tracked.has(el)) {
        observer.observe(el);
      }
    });
  }

  observeElements();

  // Watch for dynamically added elements
  if (typeof MutationObserver !== 'undefined') {
    const mut = new MutationObserver(() => observeElements());
    mut.observe(document.body, { childList: true, subtree: true });
  }
}
