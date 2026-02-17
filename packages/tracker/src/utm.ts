/**
 * UTM parameter parser
 */

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export function parseUTM(url?: string): UTMParams {
  try {
    const params = new URL(url || window.location.href).searchParams;
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
  }
}
