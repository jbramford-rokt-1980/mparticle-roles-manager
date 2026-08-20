export interface RateLimiterOptions {
  /** Requests allowed per window per key; default budgets below the API's 100/min. */
  capacity?: number;
  windowMs?: number;
}

export type TakeResult = { ok: true } | { ok: false; retryAfterSec: number };

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Token bucket per environment key, budgeted under the documented
 * 100 requests/minute so the app never triggers a real 429 on its own.
 */
export class RateLimiter {
  private readonly capacity: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(options: RateLimiterOptions = {}) {
    this.capacity = options.capacity ?? 80;
    this.windowMs = options.windowMs ?? 60_000;
  }

  take(key: string): TakeResult {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };

    const elapsed = now - bucket.lastRefill;
    const refill = (elapsed / this.windowMs) * this.capacity;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);
      return { ok: true };
    }

    this.buckets.set(key, bucket);
    const msPerToken = this.windowMs / this.capacity;
    const retryAfterSec = Math.ceil(((1 - bucket.tokens) * msPerToken) / 1000);
    return { ok: false, retryAfterSec };
  }
}
