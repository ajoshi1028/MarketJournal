import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

/** Shared Upstash Redis client. Null when env vars are absent (local dev). */
export function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// In-memory fallback cache for local dev when Upstash is not configured.
const memCache = new Map<string, { value: unknown; expiresAt: number }>();

/**
 * Read-through JSON cache. Returns the cached value for `key`, or runs
 * `compute()`, stores the result with `ttlSeconds`, and returns it.
 *
 * Used for shared upstream data (e.g. options chains) that must NOT be
 * edge-cached because the responses serving it are auth-gated — caching
 * here keeps the gate in the request path while still deduping fetches.
 */
export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const r = getRedis();

  if (r) {
    const hit = await r.get<T>(key);
    if (hit != null) return hit;
    const value = await compute();
    await r.set(key, value, { ex: ttlSeconds });
    return value;
  }

  const now = Date.now();
  const hit = memCache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await compute();
  memCache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}
