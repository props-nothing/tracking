/**
 * Dead click detection — clicks on non-interactive elements that produce no DOM response
 */
import { EventPayload } from './collect';

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'DETAILS', 'SUMMARY']);

export function trackDeadClicks(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Skip if the element is interactive
    if (INTERACTIVE_TAGS.has(target.tagName)) return;
    if (target.closest('a, button, input, select, textarea, [role="button"], [onclick]')) return;
    if (target.getAttribute('role') === 'button') return;
    if (target.hasAttribute('onclick') || target.hasAttribute('tabindex')) return;
    if (getComputedStyle(target).cursor === 'pointer') return;

    // Wait 1 second and check if anything happened (URL change, DOM mutation)
    const initialURL = window.location.href;
    let domChanged = false;

    const observer = new MutationObserver(() => {
      domChanged = true;
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    setTimeout(() => {
      observer.disconnect();
      if (!domChanged && window.location.href === initialURL) {
        onEvent({
          event_type: 'dead_click',
          event_name: 'dead_click',
          event_data: {
            x: e.clientX,
            y: e.clientY,
            element_tag: target.tagName?.toLowerCase(),
            element_id: target.id || null,
            element_class: target.className?.toString().slice(0, 100) || null,
            element_text: (target.textContent || '').trim().slice(0, 100) || null,
          },
        });
      }
    }, 1000);
  });
}
