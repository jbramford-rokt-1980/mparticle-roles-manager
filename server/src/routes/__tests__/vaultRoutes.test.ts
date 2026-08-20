import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../app';

const kdf = { N: 1024, r: 8, p: 1 };

describe('vault routes', () => {
  let dir: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vault-routes-'));
    app = buildApp({ vaultPath: path.join(dir, 'vault.enc.json'), idleLockMinutes: 0, kdf });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('reports uninitialized before init', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vault/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'uninitialized' });
  });

  it('init unlocks the vault', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'unlocked' });
  });

  it('rejects a second init with 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'another-passphrase' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'VALIDATION' });
  });

  it('rejects a short passphrase with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('lock, failed unlock, then successful unlock', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });

    const lockRes = await app.inject({ method: 'POST', url: '/api/vault/lock' });
    expect(lockRes.json()).toEqual({ status: 'locked' });

    const badRes = await app.inject({
      method: 'POST',
      url: '/api/vault/unlock',
      payload: { passphrase: 'wrong-passphrase' },
    });
    expect(badRes.statusCode).toBe(401);
    expect(badRes.json()).toMatchObject({ code: 'VAULT_BAD_PASSPHRASE' });

    const goodRes = await app.inject({
      method: 'POST',
      url: '/api/vault/unlock',
      payload: { passphrase: 'a-long-passphrase' },
    });
    expect(goodRes.statusCode).toBe(200);
    expect(goodRes.json()).toEqual({ status: 'unlocked' });
  });

  it('never echoes the passphrase in any response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vault/init',
      payload: { passphrase: 'a-long-passphrase' },
    });
    expect(res.body).not.toContain('a-long-passphrase');
  });
});
