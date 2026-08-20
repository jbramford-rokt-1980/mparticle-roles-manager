import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOKEN_AUDIENCE, TOKEN_URL } from '@roles/shared';

import { ApiError } from '../../plugins/apiError';
import { TokenManager } from '../tokenManager';

const creds = { clientId: 'cid', clientSecret: 'csecret' };

function tokenResponse(token: string, expiresIn = 28800) {
  return new Response(
    JSON.stringify({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('TokenManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests a token with the correct body and always the US1 audience', async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse('tok-1'));
    const manager = new TokenManager({ fetchFn });

    const token = await manager.getToken('1:2', creds);

    expect(token).toBe('tok-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TOKEN_URL);
    expect(JSON.parse(init.body as string)).toEqual({
      client_id: 'cid',
      client_secret: 'csecret',
      audience: TOKEN_AUDIENCE,
      grant_type: 'client_credentials',
    });
  });

  it('serves cached tokens until near expiry', async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse('tok-1'));
    const manager = new TokenManager({ fetchFn });

    await manager.getToken('1:2', creds);
    vi.advanceTimersByTime(60 * 60 * 1000);
    const again = await manager.getToken('1:2', creds);

    expect(again).toBe('tok-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('refreshes within the 60s expiry margin', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('tok-1', 120))
      .mockResolvedValueOnce(tokenResponse('tok-2', 28800));
    const manager = new TokenManager({ fetchFn });

    await manager.getToken('1:2', creds);
    vi.advanceTimersByTime(61 * 1000); // 61s into a 120s token → inside the margin
    const refreshed = await manager.getToken('1:2', creds);

    expect(refreshed).toBe('tok-2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent requests for the same key (single-flight)', async () => {
    let resolveFetch: ((r: Response) => void) | undefined;
    const fetchFn = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    const manager = new TokenManager({ fetchFn });

    const p1 = manager.getToken('1:2', creds);
    const p2 = manager.getToken('1:2', creds);
    resolveFetch?.(tokenResponse('tok-1'));

    expect(await p1).toBe('tok-1');
    expect(await p2).toBe('tok-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('caches per key, not globally', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('tok-a'))
      .mockResolvedValueOnce(tokenResponse('tok-b'));
    const manager = new TokenManager({ fetchFn });

    expect(await manager.getToken('1:2', creds)).toBe('tok-a');
    expect(await manager.getToken('3:4', creds)).toBe('tok-b');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('invalidate forces a fresh token', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('tok-1'))
      .mockResolvedValueOnce(tokenResponse('tok-2'));
    const manager = new TokenManager({ fetchFn });

    await manager.getToken('1:2', creds);
    manager.invalidate('1:2');
    expect(await manager.getToken('1:2', creds)).toBe('tok-2');
  });

  it('maps a rejected token request to AUTH_FAILED', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'access_denied' }), { status: 401 }),
    );
    const manager = new TokenManager({ fetchFn });

    const err = await manager.getToken('1:2', creds).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('AUTH_FAILED');
  });

  it('does not cache failures', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(tokenResponse('tok-2'));
    const manager = new TokenManager({ fetchFn });

    await expect(manager.getToken('1:2', creds)).rejects.toThrow();
    expect(await manager.getToken('1:2', creds)).toBe('tok-2');
  });
});
