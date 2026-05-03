import { afterEach, describe, expect, it } from 'vitest';
import { __resetRateLimitForTests, rateLimit } from '@/lib/rate-limit';

afterEach(() => {
  __resetRateLimitForTests();
});

describe('rateLimit', () => {
  it('allows up to limit calls inside the window', () => {
    const opts = { key: 'k', limit: 3, windowMs: 60_000 };
    expect(rateLimit({ ...opts, now: 1000 }).ok).toBe(true);
    expect(rateLimit({ ...opts, now: 1100 }).ok).toBe(true);
    expect(rateLimit({ ...opts, now: 1200 }).ok).toBe(true);
    expect(rateLimit({ ...opts, now: 1300 }).ok).toBe(false);
  });

  it('returns retryAfterMs that decreases as the window slides', () => {
    const opts = { key: 'k', limit: 1, windowMs: 1000 };
    expect(rateLimit({ ...opts, now: 0 }).ok).toBe(true);
    const blocked = rateLimit({ ...opts, now: 200 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBe(800);
    }
  });

  it('allows again after the window rolls over', () => {
    const opts = { key: 'k', limit: 1, windowMs: 1000 };
    expect(rateLimit({ ...opts, now: 0 }).ok).toBe(true);
    expect(rateLimit({ ...opts, now: 500 }).ok).toBe(false);
    expect(rateLimit({ ...opts, now: 1500 }).ok).toBe(true);
  });

  it('isolates state per key', () => {
    const opts = { limit: 1, windowMs: 1000, now: 0 };
    expect(rateLimit({ ...opts, key: 'a' }).ok).toBe(true);
    expect(rateLimit({ ...opts, key: 'b' }).ok).toBe(true);
    expect(rateLimit({ ...opts, key: 'a' }).ok).toBe(false);
  });
});
