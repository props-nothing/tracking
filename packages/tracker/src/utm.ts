/**
 * UTM parameter parser — persists landing page UTMs in sessionStorage
 * so they survive navigation across pages within the same session.
 */

const UTM_STORAGE_KEY = '_tk_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

function readStored(): UTMParams | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UTMParams;
  } catch {
    return null;
  }
}

function store(utm: UTMParams): void {
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  } catch { /* ignore */ }
}

export function parseUTM(url?: string): UTMParams {
  try {
    const params = new URL(url || window.location.href).searchParams;
    const fromUrl: UTMParams = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
    };

    const hasUrlUtm = UTM_KEYS.some((k) => fromUrl[k]);

    if (hasUrlUtm) {
      // New UTMs in URL → save them for the rest of the session
      store(fromUrl);
      return fromUrl;
    }

    // No UTMs in current URL → fall back to stored session UTMs
    const stored = readStored();
    if (stored) return stored;

    return fromUrl; // all nulls
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
  }
}
