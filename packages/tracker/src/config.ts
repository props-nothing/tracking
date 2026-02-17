/**
 * Configuration — reads data-* attributes from the script tag
 */
import { getScriptTag } from './utils';

export interface TrackerConfig {
  siteId: string;
  apiUrl: string;
  debug: boolean;
  respectDNT: boolean;
  trackForms: boolean;
  trackOutbound: boolean;
  trackDownloads: boolean;
  trackErrors: boolean;
  trackRageClicks: boolean;
}

export function readConfig(): TrackerConfig | null {
  const script = getScriptTag();
  if (!script) return null;

  const siteId = script.getAttribute('data-site-id');
  if (!siteId) return null;

  // Derive API URL: default to same origin /api/collect
  const scriptSrc = script.getAttribute('src') || '';
  let defaultApi = '/api/collect';
  try {
    if (scriptSrc) {
      const url = new URL(scriptSrc, window.location.href);
      defaultApi = `${url.origin}/api/collect`;
    }
  } catch { /* ignore */ }

  return {
    siteId,
    apiUrl: script.getAttribute('data-api') || defaultApi,
    debug: script.getAttribute('data-debug') === 'true',
    respectDNT: script.getAttribute('data-respect-dnt') === 'true',
    trackForms: script.getAttribute('data-track-forms') !== 'false',
    trackOutbound: script.getAttribute('data-track-outbound') !== 'false',
    trackDownloads: script.getAttribute('data-track-downloads') !== 'false',
    trackErrors: script.getAttribute('data-track-errors') !== 'false',
    trackRageClicks: script.getAttribute('data-track-rage-clicks') !== 'false',
  };
}
