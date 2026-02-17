/**
 * Utility functions for the tracking script
 */

/** Check if the current user agent is a known bot */
export function isBot(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent;
  const botPatterns = /bot|crawl|spider|slurp|facebookexternalhit|baiduspider|yandex|duckduck|googlebot|bingbot|linkedinbot|mediapartners|adsbot|curl|wget|python|java|node-fetch|axios|undici|headlesschrome|phantomjs|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot/i;
  return botPatterns.test(ua);
}

/** Check if Do Not Track or Global Privacy Control is enabled */
export function isDNTEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt = (navigator as any).doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
  const gpc = (navigator as any).globalPrivacyControl;
  return dnt === '1' || dnt === 'yes' || gpc === true;
}

/** Generate a UUID v4 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get the current script tag */
export function getScriptTag(): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  return document.currentScript as HTMLScriptElement | null
    ?? document.querySelector('script[data-site-id]');
}

/** Log debug messages */
export function debug(enabled: boolean, ...args: any[]): void {
  if (enabled) {
    console.log('[Tracking]', ...args);
  }
}
