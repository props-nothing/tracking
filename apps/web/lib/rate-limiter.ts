import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Validate that real credentials are provided (not placeholders)
  if (!url || !token || !url.startsWith('https://') || url === 'https://...' || token === '...') {
    return null;
  }

  try {
    ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 events per minute per IP
      analytics: false,
    });
    return ratelimit;
  } catch (err) {
    console.warn('[RateLimit] Failed to initialize Redis:', err);
    return null;
  }
}

/**
 * Check if a request from the given IP is rate-limited.
 * Returns { success: true } if allowed, { success: false } if rate-limited.
 * If Redis is not configured, always allows.
 */
export async function checkRateLimit(ip: string): Promise<{ success: boolean; remaining?: number }> {
  try {
    const limiter = getRateLimiter();
    if (!limiter) return { success: true };

    const result = await limiter.limit(ip);
    return { success: result.success, remaining: result.remaining };
  } catch {
    // If Redis is down or misconfigured, allow the request
    return { success: true };
  }
}
