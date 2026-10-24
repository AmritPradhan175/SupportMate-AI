export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
}

export interface RateLimiterOptions {
  /** Maximum requests allowed per key inside the window. */
  limit: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

const MAX_TRACKED_KEYS = 5_000;

/**
 * Sliding-window limiter held in process memory.
 *
 * It is fine for local development and a single server process. On Vercel (or any
 * multi-instance deployment) every instance keeps its own counters, so the effective
 * limit is higher than configured and resets on cold starts. Use a shared store such as
 * Upstash Redis or Vercel KV for production.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(currentTime: number): void {
    for (const [key, timestamps] of hits) {
      if (timestamps.every((timestamp) => currentTime - timestamp >= windowMs)) {
        hits.delete(key);
      }
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      if (hits.size > MAX_TRACKED_KEYS) prune(currentTime);

      const recent = (hits.get(key) ?? []).filter((timestamp) => currentTime - timestamp < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        const retryAfterMs = windowMs - (currentTime - recent[0]);
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }

      recent.push(currentTime);
      hits.set(key, recent);
      return { allowed: true, remaining: limit - recent.length, retryAfterSeconds: 0 };
    },
    reset(): void {
      hits.clear();
    },
  };
}

/**
 * Best-effort client IP. On Vercel the platform sets x-forwarded-for itself. Behind other
 * proxies, make sure only your proxy can set this header or the limit can be bypassed.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
