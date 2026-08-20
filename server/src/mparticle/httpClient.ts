import { PLATFORM_PATH_PREFIX, PODS, type EnvironmentConfig } from '@roles/shared';

import { ApiError } from '../plugins/apiError';
import type { TokenCredentials } from '../auth/tokenManager';
import { mapUpstreamError } from './errorMapper';
import type { RateLimiter } from './rateLimiter';

export interface TokenProvider {
  getToken(key: string, creds: TokenCredentials): Promise<string>;
  invalidate(key: string): void;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface MParticleHttpClientOptions {
  tokens: TokenProvider;
  fetchFn?: FetchLike;
  sleepFn?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  /** Local budget below the API's 100/min; requests beyond it fail fast. */
  rateLimiter?: RateLimiter;
}

type Method = 'GET' | 'PUT';

const MAX_5XX_RETRIES = 2;

/**
 * Pod-aware HTTP client for the mParticle Platform API.
 * 401 → refresh token, retry once. Transient 5xx → retry GETs only.
 * PUTs are never retried automatically (a duplicate manifest PUT is not safe
 * to assume idempotent under concurrent editors).
 */
export class MParticleHttpClient {
  private readonly tokens: TokenProvider;
  private readonly fetchFn: FetchLike;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly rateLimiter: RateLimiter | undefined;

  constructor(options: MParticleHttpClientOptions) {
    this.tokens = options.tokens;
    this.fetchFn = options.fetchFn ?? ((url, init) => fetch(url, init));
    this.sleepFn = options.sleepFn ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.rateLimiter = options.rateLimiter;
  }

  async request<T>(env: EnvironmentConfig, method: Method, path: string, body?: unknown): Promise<T> {
    const key = `${env.orgId}:${env.accountId}`;
    const creds: TokenCredentials = { clientId: env.clientId, clientSecret: env.clientSecret };
    const url =
      PODS[env.pod].apiBase +
      PLATFORM_PATH_PREFIX +
      `/organizations/${env.orgId}/accounts/${env.accountId}` +
      path;

    if (this.rateLimiter) {
      const budget = this.rateLimiter.take(key);
      if (!budget.ok) {
        throw new ApiError(
          'RATE_LIMITED',
          429,
          `Request budget for this environment is used up (kept below mParticle's 100/min). Retry in ${budget.retryAfterSec}s.`,
          { retryAfter: budget.retryAfterSec },
        );
      }
    }

    let attempt = 0;
    let retried401 = false;

    for (;;) {
      const token = await this.tokens.getToken(key, creds);
      const res = await this.fetchFn(url, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (res.status === 401 && !retried401) {
        retried401 = true;
        this.tokens.invalidate(key);
        continue;
      }

      if (res.status >= 500 && method === 'GET' && attempt < MAX_5XX_RETRIES) {
        attempt += 1;
        await this.sleepFn(250 * attempt);
        continue;
      }

      const bodyText = await res.text().catch(() => '');
      throw mapUpstreamError(res.status, bodyText, res.headers.get('retry-after') ?? undefined);
    }
  }
}
