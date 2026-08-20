import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { EnvironmentConfig } from '@roles/shared';

export interface VaultData {
  environments: EnvironmentConfig[];
}

export interface KdfParams {
  N: number;
  r: number;
  p: number;
}

export interface EncryptedVaultFile {
  formatVersion: 1;
  kdf: KdfParams & { algo: 'scrypt'; salt: string };
  cipher: { algo: 'aes-256-gcm'; iv: string; authTag: string; ciphertext: string };
}

/** Wrong passphrase and tampered file are indistinguishable by design (GCM auth failure). */
export class VaultDecryptError extends Error {
  constructor() {
    super('Vault could not be decrypted: wrong passphrase or corrupted file');
    this.name = 'VaultDecryptError';
  }
}

const DEFAULT_KDF: KdfParams = { N: 2 ** 15, r: 8, p: 1 };
const FORMAT_VERSION = 1;

export interface VaultCryptoOptions {
  kdf?: KdfParams;
}

export function deriveKey(passphrase: string, salt: Buffer, kdf: KdfParams): Buffer {
  return scryptSync(passphrase, salt, 32, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    maxmem: 256 * 1024 * 1024,
  });
}

export function encryptVault(
  data: VaultData,
  passphrase: string,
  options: VaultCryptoOptions = {},
): EncryptedVaultFile {
  const kdf = options.kdf ?? DEFAULT_KDF;
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt, kdf);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(String(FORMAT_VERSION)));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return {
      formatVersion: FORMAT_VERSION,
      kdf: { algo: 'scrypt', salt: salt.toString('base64'), ...kdf },
      cipher: {
        algo: 'aes-256-gcm',
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
      },
    };
  } finally {
    key.fill(0);
  }
}

export function decryptVault(file: EncryptedVaultFile, passphrase: string): VaultData {
  const salt = Buffer.from(file.kdf.salt, 'base64');
  const key = deriveKey(passphrase, salt, file.kdf);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(file.cipher.iv, 'base64'));
    decipher.setAAD(Buffer.from(String(file.formatVersion)));
    decipher.setAuthTag(Buffer.from(file.cipher.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(file.cipher.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as VaultData;
  } catch {
    throw new VaultDecryptError();
  } finally {
    key.fill(0);
  }
}

export async function loadVaultFile(filePath: string): Promise<EncryptedVaultFile | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as EncryptedVaultFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Atomic write: encrypt, write to a temp file in the same dir, then rename over. */
export async function saveVaultFile(
  filePath: string,
  data: VaultData,
  passphrase: string,
  options: VaultCryptoOptions = {},
): Promise<void> {
  const file = encryptVault(data, passphrase, options);
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(tmpPath, JSON.stringify(file, null, 2), { mode: 0o600 });
  await rename(tmpPath, filePath);
}
