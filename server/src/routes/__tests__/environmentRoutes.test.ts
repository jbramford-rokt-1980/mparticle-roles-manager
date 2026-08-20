import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app';

const kdf = { N: 1024, r: 8, p: 1 };

const envInput = {
  label: 'Demo Org EU1',
  pod: 'eu1',
  orgId: 100,
  accountId: 200,
  clientId: 'client-abc',
  clientSecret: 'very-secret-value-4321',
};

function tokenAndTasksFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('sso.auth')) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: 't', expires_in: 28800 }), { status: 200 }),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify([
          { task_id: 'audiences:view', display_name: 'Audiences view', description: '' },
        ]),
        { status: 200 },
      ),
    );
  });
}

describe('environment routes', () => {
  let dir: string;
  let app: ReturnType<typeof buildApp>;
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'env-routes-'));
    fetchFn = tokenAndTasksFetch();
    app = buildApp({
      vaultPath: path.join(dir, 'vault.enc.json'),
      idleLockMinutes: 0,
      kdf,
      fetchFn,
    });
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function createEnv() {
    return app.inject({ method: 'POST', url: '/api/environments', payload: envInput });
  }

  it('rejects all environment routes while locked', async () => {
    await app.inject({ method: 'POST', url: '/api/vault/lock' });
    const res = await app.inject({ method: 'GET', url: '/api/environments' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'VAULT_LOCKED' });
  });

  it('creates an environment and returns it masked', async () => {
    const res = await createEnv();
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.clientSecretMasked).toBe('••••4321');
    expect(res.body).not.toContain('very-secret-value-4321');
    expect(typeof body.id).toBe('string');
  });

  it('lists environments masked and persists them in the vault', async () => {
    await createEnv();
    const res = await app.inject({ method: 'GET', url: '/api/environments' });
    const list = res.json() as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]?.label).toBe('Demo Org EU1');
    expect(res.body).not.toContain('very-secret-value-4321');
  });

  it('updates without a secret and keeps the stored one', async () => {
    const created = (await createEnv()).json() as { id: string };
    const res = await app.inject({
      method: 'PUT',
      url: `/api/environments/${created.id}`,
      payload: { ...envInput, clientSecret: undefined, label: 'Renamed' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { label: string }).label).toBe('Renamed');

    // The stored secret must still be the original — test-connection sends it upstream.
    await app.inject({ method: 'POST', url: `/api/environments/${created.id}/test` });
    const tokenCall = fetchFn.mock.calls.find(([url]) => (url as string).includes('sso.auth'));
    expect(tokenCall).toBeDefined();
    const body = JSON.parse((tokenCall?.[1] as RequestInit).body as string) as {
      client_secret: string;
    };
    expect(body.client_secret).toBe('very-secret-value-4321');
  });

  it('deletes an environment', async () => {
    const created = (await createEnv()).json() as { id: string };
    const del = await app.inject({ method: 'DELETE', url: `/api/environments/${created.id}` });
    expect(del.statusCode).toBe(200);
    const list = (await app.inject({ method: 'GET', url: '/api/environments' })).json() as [];
    expect(list).toHaveLength(0);
  });

  it('test-connection reports ok with a task count', async () => {
    const created = (await createEnv()).json() as { id: string };
    const res = await app.inject({ method: 'POST', url: `/api/environments/${created.id}/test` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, taskCount: 1 });
  });

  it('test-connection surfaces AUTH_FAILED for rejected credentials', async () => {
    fetchFn.mockImplementation(() => Promise.resolve(new Response('denied', { status: 401 })));
    const created = (await createEnv()).json() as { id: string };
    const res = await app.inject({ method: 'POST', url: `/api/environments/${created.id}/test` });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'AUTH_FAILED' });
  });

  it('404s on unknown environment ids', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/environments/nope/test' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
