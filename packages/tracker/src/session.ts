/**
 * Session ID management — stored in sessionStorage, rotates after 30 min idle
 */
import { uuid } from './utils';

const SESSION_KEY = '_tk_sid';
const SESSION_TS_KEY = '_tk_ts';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function getSessionId(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const lastActivity = sessionStorage.getItem(SESSION_TS_KEY);
    const now = Date.now();

    if (stored && lastActivity && now - parseInt(lastActivity, 10) < SESSION_TIMEOUT) {
      sessionStorage.setItem(SESSION_TS_KEY, now.toString());
      return stored;
    }

    // New session
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_TS_KEY, now.toString());
    return id;
  } catch {
    // sessionStorage unavailable (e.g., iframe sandbox)
    return uuid();
  }
}

export function touchSession(): void {
  try {
    sessionStorage.setItem(SESSION_TS_KEY, Date.now().toString());
  } catch { /* ignore */ }
}
