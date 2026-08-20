import { TOKEN_AUDIENCE, TOKEN_URL } from '@roles/shared';

import { ApiError } from '../plugins/apiError';

export interface TokenCredentials {
  clientId: string;
  clientSecret: string;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface TokenManagerOptions {
  fetchFn?: FetchLike;
  /** Refresh this long before actual expiry; tokens take 1–3s to issue. */
  refreshMarginMs?: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Caches OAuth bearer tokens per `${orgId}:${accountId}` key.
 * Tokens live ~8h and cannot be revoked; they stay in process memory only.
 * Concurrent callers for the same key share one in-flight request.
 */
export class TokenManager {
  private readonly fetchFn: FetchLike;
  private readonly refreshMarginMs: number;
  private readonly cache = new Map<string, CachedToken>();
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(options: TokenManagerOptions = {}) {
    this.fetchFn = options.fetchFn ?? ((url, init) => fetch(url, init));
    this.refreshMarginMs = options.refreshMarginMs ?? 60_000;
  }

  async getToken(key: string, creds: TokenCredentials): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt - this.refreshMarginMs) {
      return cached.token;
    }

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = this.requestToken(key, creds).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, request);
    return request;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private async requestToken(key: string, creds: TokenCredentials): Promise<string> {
    const res = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        // Always the US1 audience, even for other pods — see shared/pods.ts.
        audience: TOKEN_AUDIENCE,
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      throw new ApiError(
        'AUTH_FAILED',
        401,
        'mParticle rejected the credentials — re-check client_id and client_secret for this environment',
      );
    }

    const body = (await res.json()) as TokenResponse;
    this.cache.set(key, {
      token: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    });
    return body.access_token;
  }
}
