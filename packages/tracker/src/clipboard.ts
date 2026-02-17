/**
 * Copy event tracking — detects clipboard copy events
 */
import { EventPayload } from './collect';

export function trackClipboard(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    const text = selection?.toString() || '';

    // Find the source element
    const anchorNode = selection?.anchorNode;
    const sourceElement = anchorNode instanceof HTMLElement
      ? anchorNode
      : anchorNode?.parentElement;

    onEvent({
      event_type: 'copy',
      event_name: 'copy',
      event_data: {
        text_length: text.length,
        source_tag: sourceElement?.tagName?.toLowerCase() || null,
        source_id: sourceElement?.id || null,
      },
    });
  });
}
