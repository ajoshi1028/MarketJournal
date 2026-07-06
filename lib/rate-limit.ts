import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.max(1, Math.round(windowMs / 1000));
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "rl",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// In-memory fallback for local dev when Upstash is not configured
const fallbackMap = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = fallbackMap.get(key);

  if (!entry || now > entry.resetTime) {
    fallbackMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return fallbackRateLimit(key, limit, windowMs);

  const result = await limiter.limit(key);
  return { success: result.success, remaining: result.remaining };
}
