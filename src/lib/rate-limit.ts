// In-memory sliding-window rate limiter.
// Single-process only — for multi-instance deployments, swap the
// underlying Map with Redis/Upstash without changing the call sites.

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

const globalForRate = globalThis as unknown as {
  __rateLimitStore?: Map<string, number[]>;
};
const store: Map<string, number[]> =
  globalForRate.__rateLimitStore ?? (globalForRate.__rateLimitStore = new Map());

export function rateLimit({ key, limit, windowMs, now }: RateLimitOptions): RateLimitResult {
  const ts = now ?? Date.now();
  const cutoff = ts - windowMs;
  const recent = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    store.set(key, recent);
    const oldest = recent[0];
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (ts - oldest)) };
  }

  recent.push(ts);
  store.set(key, recent);
  return { ok: true, remaining: limit - recent.length };
}

export function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null
  );
}

// Test-only: clear all rate-limit state.
export function __resetRateLimitForTests() {
  store.clear();
}
