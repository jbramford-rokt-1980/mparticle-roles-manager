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
  clientSecret: 'secret-1234',
};

const upstreamTasks = [
  { task_id: 'audiences:view', display_name: 'Audiences View', description: '' },
  { task_id: 'audiences:*', display_name: 'Audiences Full', description: '' },
];

const upstreamManifest = {
  roles: [{ role_id: 'ops', name: 'Ops', description: 'Ops role', tasks: [{ task_id: 'audiences:view' }] }],
  last_modified_on: '2026-08-01T00:00:00Z',
  last_modified_by: 'someone@rokt.com',
  version: 4,
};

describe('roles read routes', () => {
  let dir: string;
  let app: ReturnType<typeof buildApp>;
  let fetchFn: ReturnType<typeof vi.fn>;
  let envId: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'roles-routes-'));
    fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('sso.auth')) {
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: 't', expires_in: 28800 }), { status: 200 }),
        );
      }
      if (url.endsWith('/tasks')) {
        return Promise.resolve(new Response(JSON.stringify(upstreamTasks), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(upstreamManifest), { status: 200 }));
    });
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
    const created = await app.inject({
      method: 'POST',
      url: '/api/environments',
      payload: envInput,
    });
    envId = (created.json() as { id: string }).id;
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns the live task catalog', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/environments/${envId}/tasks` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(upstreamTasks);
  });

  it('caches the task catalog per environment', async () => {
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/tasks` });
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/tasks` });
    const taskFetches = fetchFn.mock.calls.filter(([url]) => (url as string).endsWith('/tasks'));
    expect(taskFetches).toHaveLength(1);
  });

  it('returns the manifest with version and metadata', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(upstreamManifest);
  });
});

describe('mock mode', () => {
  it('serves tasks and a seeded manifest without any upstream calls', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mock-mode-'));
    const fetchFn = vi.fn();
    const app = buildApp({
      vaultPath: path.join(dir, 'vault.enc.json'),
      idleLockMinutes: 0,
      kdf,
      fetchFn,
      mockMparticle: true,
    });
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/environments',
      payload: envInput,
    });
    const envId = (created.json() as { id: string }).id;

    const tasks = await app.inject({ method: 'GET', url: `/api/environments/${envId}/tasks` });
    const manifest = await app.inject({
      method: 'GET',
      url: `/api/environments/${envId}/manifest`,
    });

    expect(tasks.statusCode).toBe(200);
    expect((tasks.json() as unknown[]).length).toBeGreaterThan(10);
    expect(manifest.statusCode).toBe(200);
    expect((manifest.json() as { roles: unknown[] }).roles.length).toBeGreaterThan(0);
    expect(fetchFn).not.toHaveBeenCalled();

    await app.close();
    await rm(dir, { recursive: true, force: true });
  });
});
