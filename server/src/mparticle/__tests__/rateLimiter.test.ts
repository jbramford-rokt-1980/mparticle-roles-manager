import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows up to the budget within a window', () => {
    const limiter = new RateLimiter({ capacity: 3, windowMs: 60_000 });
    expect(limiter.take('k').ok).toBe(true);
    expect(limiter.take('k').ok).toBe(true);
    expect(limiter.take('k').ok).toBe(true);
    const fourth = limiter.take('k');
    expect(fourth.ok).toBe(false);
    expect(fourth.ok === false && fourth.retryAfterSec).toBeGreaterThan(0);
  });

  it('refills over time', () => {
    const limiter = new RateLimiter({ capacity: 2, windowMs: 60_000 });
    limiter.take('k');
    limiter.take('k');
    expect(limiter.take('k').ok).toBe(false);
    vi.advanceTimersByTime(31_000); // half a window refills one token
    expect(limiter.take('k').ok).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter({ capacity: 1, windowMs: 60_000 });
    expect(limiter.take('a').ok).toBe(true);
    expect(limiter.take('b').ok).toBe(true);
    expect(limiter.take('a').ok).toBe(false);
  });
});
