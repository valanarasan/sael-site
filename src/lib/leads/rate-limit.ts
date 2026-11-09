/**
 * In-memory sliding-window rate limiter (5 per 10 minutes by default). It counts per server
 * instance, which is enough for one Node process; a multi-instance host would swap in a shared
 * store (e.g. KV) behind the same RateLimiter interface.
 */
import type { RateLimiter } from './types';

export interface MemoryRateLimitOptions {
  max: number;
  windowSeconds: number;
  now?: () => number;
  /** Upper bound on tracked keys, so a flood of addresses can't grow memory without limit. */
  maxKeys?: number;
}

export function memoryRateLimiter({
  max,
  windowSeconds,
  now = Date.now,
  maxKeys = 10_000,
}: MemoryRateLimitOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  const windowMs = windowSeconds * 1000;

  return {
    async hit(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        const oldest = recent[0] ?? t;
        return { allowed: false, retryAfterSeconds: Math.ceil((oldest + windowMs - t) / 1000) };
      }
      recent.push(t);
      hits.delete(key); // re-insert so Map order tracks the most recent use
      hits.set(key, recent);
      if (hits.size > maxKeys) {
        const stalest = hits.keys().next().value;
        if (stalest !== undefined) hits.delete(stalest);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
