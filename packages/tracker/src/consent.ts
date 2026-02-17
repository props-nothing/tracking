/**
 * Consent mode toggle — persists to localStorage
 */

const STORAGE_KEY = '__trk_consent';

function readStored(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch { /* storage unavailable */ }
  return null;
}

let consentGranted: boolean = readStored() ?? true; // default: tracking enabled

export function setConsent(granted: boolean): void {
  consentGranted = granted;
  try {
    localStorage.setItem(STORAGE_KEY, granted ? '1' : '0');
  } catch { /* ignore */ }
}

export function hasConsent(): boolean {
  return consentGranted;
}
