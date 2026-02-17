import * as crypto from 'crypto';

// Daily salt stored in memory — loaded from DB, rotated by cron job daily
let currentSalt = process.env.DAILY_SALT_SECRET || 'default-salt-change-me';
let saltLoaded = false;

export function setSalt(salt: string): void {
  currentSalt = salt;
  saltLoaded = true;
}

export function getSalt(): string {
  return currentSalt;
}

/**
 * Attempt to load the daily salt from the database.
 * Called lazily on first hash generation.
 */
async function loadSaltFromDB(): Promise<void> {
  if (saltLoaded) return;
  saltLoaded = true; // prevent concurrent loads
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'daily_salt')
      .single();
    if (data?.value) {
      currentSalt = data.value;
    }
  } catch {
    // DB not available or table doesn't exist — use env/default salt
  }
}

// Kick off salt loading at module import time (non-blocking)
loadSaltFromDB().catch(() => {});

/**
 * Generate a visitor hash from IP + User-Agent + screen info + daily salt.
 * This is anonymous — no cookies, no persistent identifiers.
 */
export function generateVisitorHash(
  ip: string,
  userAgent: string,
  screenResolution: string,
  language: string,
  timezone: string
): string {
  const data = `${ip}|${userAgent}|${screenResolution}|${language}|${timezone}|${currentSalt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
