/**
 * Tracking Script — Entry Point
 * Ultra-lightweight, privacy-friendly analytics tracker (< 3 KB gzipped)
 */

import { readConfig, TrackerConfig } from './config';
import { sendEvent, sendBeacon, setDebugMode, EventPayload } from './collect';
import { getSessionId, touchSession } from './session';
import { parseUTM } from './utm';
import { observeVitals, getVitals } from './performance';
import { trackScroll, getScrollDepth, resetScrollDepth } from './scroll';
import { trackEngagement, getEngagedTime, resetEngagement } from './engagement';
import { onSPANavigation } from './spa';
import { trackOutbound } from './outbound';
import { trackDownloads } from './downloads';
import { trackForms } from './forms';
import { trackVisibility } from './visibility';
import { trackRageClicks } from './rage-click';
import { trackDeadClicks } from './dead-click';
import { trackClipboard } from './clipboard';
import { trackPrint } from './print';
import { trackErrors } from './errors';
import { createEcommercePayload, EcommerceAction, EcommerceData } from './ecommerce';
import { setConsent, hasConsent } from './consent';
import { setCustomProps, getCustomProps } from './custom-props';
import { isBot, isDNTEnabled, debug } from './utils';

declare global {
  interface Window {
    tracking: {
      event: (name: string, data?: Record<string, any>) => void;
      set: (props: Record<string, any>) => void;
      ecommerce: (action: EcommerceAction, data: EcommerceData) => void;
      consent: (granted: boolean) => void;
      debug: (enabled: boolean) => void;
    };
  }
}

(function () {
  'use strict';

  // ── Read configuration ──────────────────────────────────────
  const config = readConfig();
  if (!config) return;

  let debugEnabled = config.debug;
  setDebugMode(debugEnabled);

  debug(debugEnabled, 'Config loaded:', config);

  // ── Check consent / DNT / bots ──────────────────────────────
  if (config.respectDNT && isDNTEnabled()) {
    debug(debugEnabled, 'DNT/GPC detected — tracking disabled');
    return;
  }

  if (isBot()) {
    debug(debugEnabled, 'Bot detected — tracking disabled');
    return;
  }

  // ── Session ─────────────────────────────────────────────────
  const sessionId = getSessionId();
  debug(debugEnabled, 'Session ID:', sessionId);

  // ── Collect page data ───────────────────────────────────────
  function buildBasePayload(): EventPayload {
    const utm = parseUTM();
    const loc = window.location;

    let referrerHostname: string | null = null;
    try {
      if (document.referrer) {
        referrerHostname = new URL(document.referrer).hostname;
      }
    } catch { /* ignore */ }

    return {
      site_id: config!.siteId,
      url: loc.href,
      path: loc.pathname,
      hostname: loc.hostname,
      page_title: document.title,
      referrer: document.referrer || null,
      referrer_hostname: referrerHostname,
      ...utm,
      session_id: getSessionId(),
      custom_props: getCustomProps(),
      screen_width: window.screen?.width || null,
      screen_height: window.screen?.height || null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      language: navigator.language || null,
      timezone: Intl?.DateTimeFormat?.().resolvedOptions?.()?.timeZone || null,
      connection_type: (navigator as any).connection?.effectiveType || null,
    };
  }

  function emitEvent(overrides: Partial<EventPayload>): void {
    if (!hasConsent()) {
      debug(debugEnabled, 'No consent — event skipped');
      return;
    }
    touchSession();
    const payload = { ...buildBasePayload(), ...overrides };
    sendEvent(config!.apiUrl, payload);
  }

  function emitBeacon(overrides: Partial<EventPayload>): void {
    if (!hasConsent()) return;
    const payload = { ...buildBasePayload(), ...overrides };
    sendBeacon(config!.apiUrl, payload);
  }

  // ── Send initial pageview ───────────────────────────────────
  emitEvent({ event_type: 'pageview' });

  // ── Detect 404 pages ────────────────────────────────────────
  // Client-side heuristic: check title, meta tags, and common 404 indicators
  (function detect404() {
    const title = (document.title || '').toLowerCase();
    const metaStatus = document.querySelector('meta[name="status-code"]')?.getAttribute('content');
    const body = document.body?.innerText?.slice(0, 500).toLowerCase() || '';

    const is404 =
      metaStatus === '404' ||
      /\b404\b/.test(title) ||
      /page not found|not found|pagina niet gevonden/.test(title) ||
      (document.querySelector('[data-404]') !== null);

    if (is404) {
      emitEvent({
        event_type: 'custom',
        event_name: '404',
        event_data: {
          path: window.location.pathname,
          referrer: document.referrer || null,
          title: document.title,
        },
      });
    }
  })();

  // ── Web Vitals ──────────────────────────────────────────────
  observeVitals();

  // ── Scroll depth ────────────────────────────────────────────
  trackScroll();

  // ── Engaged time ────────────────────────────────────────────
  trackEngagement();

  // ── SPA navigation ──────────────────────────────────────────
  let lastUrl = window.location.href;
  onSPANavigation((url) => {
    if (url === lastUrl) return;

    const oldPath = new URL(lastUrl).pathname;

    // Send unload data for previous page
    const vitals = getVitals();
    emitBeacon({
      event_type: 'pageview',
      path: oldPath,
      scroll_depth_pct: getScrollDepth(),
      engaged_time_ms: getEngagedTime(),
      ...vitals,
    });

    // Reset for new page
    resetScrollDepth();
    resetEngagement();
    lastUrl = url;

    // Send new pageview
    emitEvent({ event_type: 'pageview' });
  });

  // ── Outbound links ─────────────────────────────────────────
  if (config.trackOutbound) {
    trackOutbound(window.location.hostname, emitEvent);
  }

  // ── File downloads ──────────────────────────────────────────
  if (config.trackDownloads) {
    trackDownloads(emitEvent);
  }

  // ── Form tracking ──────────────────────────────────────────
  if (config.trackForms) {
    trackForms(emitEvent, config.captureLeads);
  }

  // ── Element visibility ─────────────────────────────────────
  trackVisibility(emitEvent);

  // ── Rage clicks ─────────────────────────────────────────────
  if (config.trackRageClicks) {
    trackRageClicks(emitEvent);
  }

  // ── Dead clicks ─────────────────────────────────────────────
  trackDeadClicks(emitEvent);

  // ── Clipboard (copy) ────────────────────────────────────────
  trackClipboard(emitEvent);

  // ── Print ───────────────────────────────────────────────────
  trackPrint(emitEvent);

  // ── Error tracking ──────────────────────────────────────────
  if (config.trackErrors) {
    trackErrors(emitEvent);
  }

  // ── Page unload — send final data ───────────────────────────
  window.addEventListener('beforeunload', () => {
    const vitals = getVitals();
    emitBeacon({
      event_type: 'pageview',
      scroll_depth_pct: getScrollDepth(),
      engaged_time_ms: getEngagedTime(),
      time_on_page_ms: getEngagedTime(),
      ...vitals,
    });
  });

  // ── Public API ──────────────────────────────────────────────
  window.tracking = {
    event(name: string, data?: Record<string, any>) {
      emitEvent({
        event_type: 'custom',
        event_name: name,
        event_data: data || {},
      });
    },

    set(props: Record<string, any>) {
      setCustomProps(props);
      debug(debugEnabled, 'Custom props updated:', getCustomProps());
    },

    ecommerce(action: EcommerceAction, data: EcommerceData) {
      const payload = createEcommercePayload(action, data);
      emitEvent(payload);
    },

    consent(granted: boolean) {
      setConsent(granted);
      debug(debugEnabled, 'Consent:', granted ? 'granted' : 'revoked');
    },

    debug(enabled: boolean) {
      debugEnabled = enabled;
      setDebugMode(enabled);
      debug(enabled, 'Debug mode:', enabled ? 'ON' : 'OFF');
    },
  };

  debug(debugEnabled, 'Tracking initialized');
})();
