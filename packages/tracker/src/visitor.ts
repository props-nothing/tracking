/**
 * Persistent Visitor ID — stored in localStorage to recognise returning visitors
 * across multiple sessions and days.
 *
 * Privacy: only set when consent is granted. Clearing localStorage resets the ID.
 */
import { uuid } from './utils';
import { hasConsent } from './consent';

const VISITOR_KEY = '__trk_vid';

let cachedVisitorId: string | null = null;

export function getVisitorId(): string | null {
  if (!hasConsent()) return null;

  if (cachedVisitorId) return cachedVisitorId;

  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored) {
      cachedVisitorId = stored;
      return stored;
    }

    // Generate new persistent visitor ID
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    cachedVisitorId = id;
    return id;
  } catch {
    // localStorage unavailable (e.g., iframe sandbox, incognito in some browsers)
    return null;
  }
}

/**
 * Clear the persistent visitor ID (e.g., when consent is revoked).
 */
export function clearVisitorId(): void {
  cachedVisitorId = null;
  try {
    localStorage.removeItem(VISITOR_KEY);
  } catch { /* ignore */ }
}
