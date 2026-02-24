// ── Centralized API client ────────────────────────────────────
// Wraps fetch calls with base URL handling, error handling, and JSON parsing.

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | unknown[];
};

async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  const init: RequestInit = { ...rest, headers };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Centralized API helpers that wrap fetch with standard error handling. */
export const api = {
  get: <T = unknown>(url: string) => request<T>(url),

  post: <T = unknown>(url: string, body: Record<string, unknown>) =>
    request<T>(url, { method: 'POST', body }),

  patch: <T = unknown>(url: string, body: Record<string, unknown>) =>
    request<T>(url, { method: 'PATCH', body }),

  delete: <T = unknown>(url: string, body?: Record<string, unknown>) =>
    request<T>(url, { method: 'DELETE', ...(body ? { body } : {}) }),
};

/** Build the stats API URL for a given site, queryString, and optional metric. */
export function statsUrl(siteId: string, queryString: string, metric?: string): string {
  let url = `/api/stats?site_id=${siteId}&${queryString}`;
  if (metric) url += `&metric=${metric}`;
  return url;
}
