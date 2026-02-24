// ── Server-side query helpers ─────────────────────────────────
// Extracted from the monolithic stats route.ts for reuse
// across split API routes.

/**
 * Paginated fetch — Supabase PostgREST caps responses at max_rows (default 1000).
 * Fetches all matching rows in batches using .range().
 */
export async function fetchAll<T = any>(
  buildQuery: (from: number, to: number) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery(offset, offset + pageSize - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/**
 * Convert a period string + optional custom dates into { fromStr, toStr } ISO strings.
 */
export function getDateRange(
  period: string,
  customFrom?: string | null,
  customTo?: string | null
) {
  const now = new Date();

  if (period === 'custom' && customFrom) {
    const from = new Date(customFrom + 'T00:00:00Z');
    const to = customTo ? new Date(customTo + 'T23:59:59.999Z') : now;
    return { fromStr: from.toISOString(), toStr: to.toISOString() };
  }

  let fromDate: Date;
  switch (period) {
    case 'today':
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case 'yesterday': {
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      fromDate = new Date(startOfToday.getTime() - 86400000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return { fromStr: fromDate.toISOString(), toStr: endOfYesterday.toISOString() };
    }
    case 'last_7_days':
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
      break;
    case 'last_30_days':
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
      break;
    case 'last_90_days':
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90));
      break;
    case 'last_365_days':
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 365));
      break;
    default:
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
  }
  return { fromStr: fromDate.toISOString(), toStr: now.toISOString() };
}

// ── Filter types (server-side) ────────────────────────────────
export interface QueryFilters {
  page?: string;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  referrer?: string;
}

/** Parse filter params from URL search params. */
export function parseFilters(searchParams: URLSearchParams): QueryFilters {
  const f: QueryFilters = {};
  for (const key of ['page', 'country', 'browser', 'os', 'device', 'referrer'] as const) {
    const val = searchParams.get(key);
    if (val) f[key] = val;
  }
  return f;
}

/** Apply database-level filters to a Supabase query builder. */
export function applyDbFilters(query: any, filters: QueryFilters): any {
  if (filters.country) query = query.eq('country_code', filters.country);
  if (filters.browser) query = query.ilike('browser', `%${filters.browser}%`);
  if (filters.os) query = query.ilike('os', `%${filters.os}%`);
  if (filters.device) query = query.eq('device_type', filters.device);
  if (filters.referrer) query = query.ilike('referrer_hostname', `%${filters.referrer}%`);
  if (filters.page) {
    const pattern = filters.page.replace(/\*/g, '%');
    query = query.ilike('path', pattern);
  }
  return query;
}

/** Count items by a key function and return sorted [key, count] entries. */
export function countBy<T>(
  arr: T[],
  keyFn: (item: T) => string | null | undefined
): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/**
 * Client-side helper: compute periodStart / periodEnd date strings for
 * components that need date range boundaries (e.g. AI insights panel).
 */
export function getPeriodDateRange(
  period: string,
  customFrom?: string,
  customTo?: string
): { periodStart: string; periodEnd: string } {
  const now = new Date();
  let from: Date;
  const to = customTo ? new Date(customTo) : now;

  if (period === 'custom' && customFrom) {
    from = new Date(customFrom);
  } else {
    switch (period) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'last_7_days':
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'last_90_days':
        from = new Date(now.getTime() - 90 * 86400000);
        break;
      case 'last_365_days':
        from = new Date(now.getTime() - 365 * 86400000);
        break;
      default:
        from = new Date(now.getTime() - 30 * 86400000);
    }
  }

  return {
    periodStart: from.toISOString().slice(0, 10),
    periodEnd: to.toISOString().slice(0, 10),
  };
}
