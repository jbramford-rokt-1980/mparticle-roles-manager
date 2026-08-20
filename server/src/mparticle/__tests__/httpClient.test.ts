import { describe, expect, it, vi } from 'vitest';

import type { EnvironmentConfig } from '@roles/shared';

import { ApiError } from '../../plugins/apiError';
import { MParticleHttpClient, type TokenProvider } from '../httpClient';

const env: EnvironmentConfig = {
  id: 'e1',
  label: 'BBC EU1',
  pod: 'eu1',
  orgId: 11,
  accountId: 22,
  clientId: 'cid',
  clientSecret: 'sec',
  createdAt: '',
  updatedAt: '',
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeTokens(tokens: string[] = ['tok-1', 'tok-2']): TokenProvider & {
  invalidated: string[];
} {
  let i = 0;
  const invalidated: string[] = [];
  return {
    invalidated,
    getToken: vi.fn().mockImplementation(() => Promise.resolve(tokens[Math.min(i++, tokens.length - 1)])),
    invalidate: (key: string) => invalidated.push(key),
  };
}

function makeClient(fetchFn: ReturnType<typeof vi.fn>, tokens = makeTokens()) {
  const client = new MParticleHttpClient({
    fetchFn,
    tokens,
    sleepFn: () => Promise.resolve(),
  });
  return { client, tokens };
}

describe('MParticleHttpClient', () => {
  it('targets the pod host with the platform prefix and bearer token', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    const { client } = makeClient(fetchFn);

    const result = await client.request<{ ok: number }>(env, 'GET', '/tasks');

    expect(result).toEqual({ ok: 1 });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.eu1.mparticle.com/platform/v2/organizations/11/accounts/22/tasks',
    );
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-1');
  });

  it('refreshes the token and retries once on 401', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    const { client, tokens } = makeClient(fetchFn);

    const result = await client.request(env, 'GET', '/roles');

    expect(result).toEqual({ ok: 1 });
    expect(tokens.invalidated).toEqual(['11:22']);
    const secondInit = fetchFn.mock.calls[1]?.[1] as RequestInit;
    expect((secondInit.headers as Record<string, string>).authorization).toBe('Bearer tok-2');
  });

  it('gives up with AUTH_FAILED after a second 401', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    const { client } = makeClient(fetchFn);

    const err = await client.request(env, 'GET', '/roles').catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('AUTH_FAILED');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retries transient 5xx on GET and eventually succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));
    const { client } = makeClient(fetchFn);

    expect(await client.request(env, 'GET', '/tasks')).toEqual({ ok: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('never retries a PUT', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 502));
    const { client } = makeClient(fetchFn);

    const err = await client
      .request(env, 'PUT', '/roles', { roles: [] })
      .catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('UPSTREAM_ERROR');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('surfaces 429 as RATE_LIMITED without retrying', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '17' }));
    const { client } = makeClient(fetchFn);

    const err = await client.request(env, 'GET', '/tasks').catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('RATE_LIMITED');
    expect((err as ApiError).retryAfter).toBe(17);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sends JSON bodies on PUT', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ done: true }));
    const { client } = makeClient(fetchFn);

    await client.request(env, 'PUT', '/roles', { roles: [{ role_id: 'r' }] });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ roles: [{ role_id: 'r' }] });
  });
});
