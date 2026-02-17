import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 events per minute per IP
    analytics: false,
  });

  return ratelimit;
}

/**
 * Check if a request from the given IP is rate-limited.
 * Returns { success: true } if allowed, { success: false } if rate-limited.
 * If Redis is not configured, always allows.
 */
export async function checkRateLimit(ip: string): Promise<{ success: boolean; remaining?: number }> {
  const limiter = getRateLimiter();
  if (!limiter) return { success: true };

  try {
    const result = await limiter.limit(ip);
    return { success: result.success, remaining: result.remaining };
  } catch {
    // If Redis is down, allow the request
    return { success: true };
  }
}
