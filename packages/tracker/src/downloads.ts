/**
 * File download detection — detects clicks on downloadable file links
 */
import { EventPayload } from './collect';

const DOWNLOAD_EXTENSIONS = /\.(pdf|zip|docx|xlsx|csv|mp4|mp3|rar|gz|tar|7z|exe|dmg|iso|avi|mov|wmv|flv|webm|ogg|wav|pptx)$/i;

export function trackDownloads(
  onEvent: (payload: Partial<EventPayload>) => void
): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (DOWNLOAD_EXTENSIONS.test(href)) {
      try {
        const url = new URL(href, window.location.href);
        const filename = url.pathname.split('/').pop() || href;
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        onEvent({
          event_type: 'file_download',
          event_name: 'file_download',
          event_data: {
            url: url.href,
            filename,
            extension: ext,
          },
        });
      } catch { /* ignore */ }
    }
  }, { capture: true });
}
