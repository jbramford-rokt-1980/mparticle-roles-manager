import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Manifest, Role } from '@roles/shared';

export interface HistoryEntryInput {
  action: 'baseline' | 'commit';
  summary: string;
  versionBefore: Manifest['version'] | null;
  versionAfter: Manifest['version'] | null;
  rolesBefore: Role[];
  rolesAfter: Role[];
}

export interface HistoryEntry extends HistoryEntryInput {
  id: string;
  timestamp: string;
}

export interface HistoryStoreOptions {
  dir: string;
  /** Newest entries kept per environment. */
  maxEntries?: number;
}

/**
 * Append-only JSONL history per environment, on disk (survives restarts).
 * Every successful commit and the first-ever manifest fetch (baseline) land
 * here, so there is always a snapshot to roll back to.
 */
export class HistoryStore {
  private readonly dir: string;
  private readonly maxEntries: number;

  constructor(options: HistoryStoreOptions) {
    this.dir = options.dir;
    this.maxEntries = options.maxEntries ?? 200;
  }

  private filePath(envId: string): string {
    // envIds are UUIDs we generate, but sanitize anyway.
    return path.join(this.dir, `${envId.replace(/[^a-zA-Z0-9-_]/g, '_')}.jsonl`);
  }

  private async readAll(envId: string): Promise<HistoryEntry[]> {
    try {
      const raw = await readFile(this.filePath(envId), 'utf8');
      return raw
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as HistoryEntry);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  private async writeAll(envId: string, entries: HistoryEntry[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const filePath = this.filePath(envId);
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    const body = entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
    await writeFile(tmpPath, body, { mode: 0o600 });
    await rename(tmpPath, filePath);
  }

  async append(envId: string, input: HistoryEntryInput): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const all = await this.readAll(envId);
    all.push(entry);
    await this.writeAll(envId, all.slice(-this.maxEntries));
    return entry;
  }

  /** Newest first. */
  async list(envId: string): Promise<HistoryEntry[]> {
    return (await this.readAll(envId)).reverse();
  }

  async get(envId: string, entryId: string): Promise<HistoryEntry | undefined> {
    return (await this.readAll(envId)).find((e) => e.id === entryId);
  }

  async hasHistory(envId: string): Promise<boolean> {
    return (await this.readAll(envId)).length > 0;
  }
}
