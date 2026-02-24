// ── Shared formatting utilities ───────────────────────────────
// Centralized formatting functions used across the dashboard.

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩',
  INR: '₹', BRL: 'R$', RUB: '₽', TRY: '₺', PLN: 'zł', CHF: 'CHF',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CZK: 'Kč', AUD: 'A$', CAD: 'C$',
};

/** Format milliseconds into a human-readable duration (e.g. "2m 30s"). */
export function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return `${ms ?? 0}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/** Format a number with K/M suffixes for compact display. */
export function formatNumber(n: number): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Truncate a URL path to a max length, adding an ellipsis. */
export function truncatePath(path: string, maxLen = 24): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 1) + '…';
}

/** Format a monetary amount with the correct currency symbol. */
export function formatMoney(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${amount.toFixed(2)}`;
}

/** Format a percentage value. */
export function formatPercent(n: number): string {
  return `${n}%`;
}

/** Format a date string to a localized date. */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a date as a relative "time ago" string. */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

/** Get a device emoji icon. */
export function getDeviceIcon(device: string | null): string {
  switch (device) {
    case 'mobile': return '📱';
    case 'tablet': return '📲';
    default: return '🖥️';
  }
}

/** Get a country flag emoji from a 2-letter country code. */
export function getCountryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(c => 0x1F1E6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
