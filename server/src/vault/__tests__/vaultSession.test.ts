import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EnvironmentConfig } from '@roles/shared';

import { VaultDecryptError } from '../vaultFile';
import { VaultLockedError, VaultSession } from '../vaultSession';

const kdf = { N: 1024, r: 8, p: 1 };

const env: EnvironmentConfig = {
  id: 'env-1',
  label: 'King US1',
  pod: 'us1',
  orgId: 1,
  accountId: 2,
  clientId: 'cid',
  clientSecret: 'shhh',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

describe('VaultSession', () => {
  let dir: string;
  let vaultPath: string;

  const makeSession = (idleLockMinutes = 30) =>
    new VaultSession({ vaultPath, idleLockMinutes, kdf });

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vault-session-'));
    vaultPath = path.join(dir, 'vault.enc.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it('reports uninitialized before any vault file exists', async () => {
    expect(await makeSession().status()).toBe('uninitialized');
  });

  it('init creates the vault and leaves it unlocked', async () => {
    const session = makeSession();
    await session.init('pass');
    expect(await session.status()).toBe('unlocked');
    expect(session.getEnvironments()).toEqual([]);
  });

  it('init refuses to overwrite an existing vault', async () => {
    const session = makeSession();
    await session.init('pass');
    await expect(makeSession().init('other')).rejects.toThrow(/already/i);
  });

  it('unlock rejects a wrong passphrase and stays locked', async () => {
    const first = makeSession();
    await first.init('pass');
    const second = makeSession();
    await expect(second.unlock('wrong')).rejects.toThrow(VaultDecryptError);
    expect(await second.status()).toBe('locked');
  });

  it('setEnvironments persists across sessions', async () => {
    const first = makeSession();
    await first.init('pass');
    await first.setEnvironments([env]);

    const second = makeSession();
    await second.unlock('pass');
    expect(second.getEnvironments()).toEqual([env]);
  });

  it('lock drops access to environments', async () => {
    const session = makeSession();
    await session.init('pass');
    session.lock();
    expect(() => session.getEnvironments()).toThrow(VaultLockedError);
    expect(await session.status()).toBe('locked');
  });

  it('auto-locks after the idle window and touch() resets it', async () => {
    vi.useFakeTimers();
    const session = makeSession(30);
    await session.init('pass');

    vi.advanceTimersByTime(29 * 60 * 1000);
    session.touch();
    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(session.isUnlocked()).toBe(true);

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(session.isUnlocked()).toBe(false);
  });

  it('disables auto-lock when idleLockMinutes is 0', async () => {
    vi.useFakeTimers();
    const session = makeSession(0);
    await session.init('pass');
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(session.isUnlocked()).toBe(true);
  });
});
