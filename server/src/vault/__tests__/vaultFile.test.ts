import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EnvironmentConfig } from '@roles/shared';

import {
  decryptVault,
  encryptVault,
  loadVaultFile,
  saveVaultFile,
  VaultDecryptError,
  type VaultData,
} from '../vaultFile';

const sampleEnv: EnvironmentConfig = {
  id: 'env-1',
  label: 'Demo Org EU1',
  pod: 'eu1',
  orgId: 1234,
  accountId: 5678,
  clientId: 'client-abc',
  clientSecret: 'super-secret-value-9876',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const data: VaultData = { environments: [sampleEnv] };
// Small scrypt cost for fast tests; production default is higher.
const kdf = { N: 1024, r: 8, p: 1 };

describe('encryptVault / decryptVault', () => {
  it('roundtrips data with the right passphrase', () => {
    const file = encryptVault(data, 'correct horse', { kdf });
    expect(decryptVault(file, 'correct horse')).toEqual(data);
  });

  it('never contains the plaintext secret in the encrypted file', () => {
    const file = encryptVault(data, 'correct horse', { kdf });
    expect(JSON.stringify(file)).not.toContain('super-secret-value-9876');
  });

  it('rejects a wrong passphrase with VaultDecryptError', () => {
    const file = encryptVault(data, 'correct horse', { kdf });
    expect(() => decryptVault(file, 'wrong horse')).toThrow(VaultDecryptError);
  });

  it('rejects tampered ciphertext with VaultDecryptError', () => {
    const file = encryptVault(data, 'correct horse', { kdf });
    const bytes = Buffer.from(file.cipher.ciphertext, 'base64');
    const firstByte = bytes[0] ?? 0;
    bytes[0] = firstByte ^ 0xff;
    const tampered = {
      ...file,
      cipher: { ...file.cipher, ciphertext: bytes.toString('base64') },
    };
    expect(() => decryptVault(tampered, 'correct horse')).toThrow(VaultDecryptError);
  });

  it('uses a fresh IV and salt on every encryption', () => {
    const a = encryptVault(data, 'correct horse', { kdf });
    const b = encryptVault(data, 'correct horse', { kdf });
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.ciphertext).not.toBe(b.cipher.ciphertext);
  });
});

describe('saveVaultFile / loadVaultFile', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'vault-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('roundtrips through disk', async () => {
    const filePath = path.join(dir, 'vault.enc.json');
    await saveVaultFile(filePath, data, 'pass', { kdf });
    const loaded = await loadVaultFile(filePath);
    expect(loaded).not.toBeNull();
    expect(decryptVault(loaded!, 'pass')).toEqual(data);
  });

  it('returns null for a missing file', async () => {
    expect(await loadVaultFile(path.join(dir, 'nope.json'))).toBeNull();
  });

  it('writes atomically, leaving no temp files behind', async () => {
    const filePath = path.join(dir, 'vault.enc.json');
    await saveVaultFile(filePath, data, 'pass', { kdf });
    await saveVaultFile(filePath, data, 'pass', { kdf });
    const entries = await readdir(dir);
    expect(entries).toEqual(['vault.enc.json']);
  });

  it('writes valid JSON with restrictive permissions content shape', async () => {
    const filePath = path.join(dir, 'vault.enc.json');
    await saveVaultFile(filePath, data, 'pass', { kdf });
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
    expect(raw).toHaveProperty('formatVersion', 1);
    expect(raw).toHaveProperty('kdf');
    expect(raw).toHaveProperty('cipher');
  });
});
