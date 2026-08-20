import type { EnvironmentConfig, VaultStatus } from '@roles/shared';

import {
  loadVaultFile,
  saveVaultFile,
  decryptVault,
  type KdfParams,
  type VaultData,
} from './vaultFile';

export class VaultLockedError extends Error {
  constructor() {
    super('Vault is locked');
    this.name = 'VaultLockedError';
  }
}

export interface VaultSessionOptions {
  vaultPath: string;
  /** 0 disables idle auto-lock. */
  idleLockMinutes: number;
  kdf?: KdfParams;
  /** Called whenever the vault locks (manually or by idle timer). */
  onLock?: () => void;
}

/**
 * Holds the decrypted vault in process memory while unlocked.
 * The passphrase is retained (in memory only) so saves can re-encrypt
 * with a fresh salt/IV; lock() wipes it.
 */
export class VaultSession {
  private readonly options: VaultSessionOptions;
  private data: VaultData | null = null;
  private passphrase: Buffer | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(options: VaultSessionOptions) {
    this.options = options;
  }

  async status(): Promise<VaultStatus> {
    if (this.data !== null) return 'unlocked';
    const file = await loadVaultFile(this.options.vaultPath);
    return file === null ? 'uninitialized' : 'locked';
  }

  isUnlocked(): boolean {
    return this.data !== null;
  }

  async init(passphrase: string): Promise<void> {
    const existing = await loadVaultFile(this.options.vaultPath);
    if (existing !== null) {
      throw new Error('Vault is already initialized');
    }
    const data: VaultData = { environments: [] };
    await saveVaultFile(this.options.vaultPath, data, passphrase, { kdf: this.options.kdf });
    this.becomeUnlocked(data, passphrase);
  }

  async unlock(passphrase: string): Promise<void> {
    const file = await loadVaultFile(this.options.vaultPath);
    if (file === null) {
      throw new Error('Vault is not initialized');
    }
    const data = decryptVault(file, passphrase);
    this.becomeUnlocked(data, passphrase);
  }

  lock(): void {
    this.data = null;
    if (this.passphrase) {
      this.passphrase.fill(0);
      this.passphrase = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.options.onLock?.();
  }

  /** Reset the idle-lock countdown; call on every authenticated request. */
  touch(): void {
    if (this.data === null) return;
    this.armIdleTimer();
  }

  getEnvironments(): EnvironmentConfig[] {
    if (this.data === null) throw new VaultLockedError();
    return this.data.environments;
  }

  async setEnvironments(environments: EnvironmentConfig[]): Promise<void> {
    if (this.data === null || this.passphrase === null) throw new VaultLockedError();
    const next: VaultData = { environments };
    await saveVaultFile(this.options.vaultPath, next, this.passphrase.toString('utf8'), {
      kdf: this.options.kdf,
    });
    this.data = next;
  }

  private becomeUnlocked(data: VaultData, passphrase: string): void {
    this.data = data;
    this.passphrase = Buffer.from(passphrase, 'utf8');
    this.armIdleTimer();
  }

  private armIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    if (this.options.idleLockMinutes <= 0) return;
    this.idleTimer = setTimeout(
      () => this.lock(),
      this.options.idleLockMinutes * 60 * 1000,
    );
    // Never keep the process alive just for the lock timer.
    this.idleTimer.unref?.();
  }
}
