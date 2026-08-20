import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Role } from '@roles/shared';

import { HistoryStore } from '../historyStore';

const roleA: Role = { role_id: 'a', name: 'A', description: '', tasks: [{ task_id: 'user:core' }] };
const roleB: Role = { role_id: 'b', name: 'B', description: '', tasks: [{ task_id: 'user:core' }] };

describe('HistoryStore', () => {
  let dir: string;
  let store: HistoryStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'history-'));
    store = new HistoryStore({ dir });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('appends entries and lists them newest first', async () => {
    await store.append('env-1', {
      action: 'baseline',
      summary: 'Initial snapshot',
      versionBefore: null,
      versionAfter: 1,
      rolesBefore: [],
      rolesAfter: [roleA],
    });
    await store.append('env-1', {
      action: 'commit',
      summary: 'Created role b',
      versionBefore: 1,
      versionAfter: 2,
      rolesBefore: [roleA],
      rolesAfter: [roleA, roleB],
    });

    const entries = await store.list('env-1');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.summary).toBe('Created role b');
    expect(entries[0]?.id).toBeTruthy();
    expect(entries[1]?.action).toBe('baseline');
  });

  it('retrieves a full entry by id', async () => {
    const appended = await store.append('env-1', {
      action: 'commit',
      summary: 'x',
      versionBefore: 1,
      versionAfter: 2,
      rolesBefore: [roleA],
      rolesAfter: [roleB],
    });
    const entry = await store.get('env-1', appended.id);
    expect(entry?.rolesAfter).toEqual([roleB]);
  });

  it('isolates environments', async () => {
    await store.append('env-1', {
      action: 'baseline',
      summary: 'a',
      versionBefore: null,
      versionAfter: 1,
      rolesBefore: [],
      rolesAfter: [roleA],
    });
    expect(await store.list('env-2')).toEqual([]);
  });

  it('reports whether an environment has history', async () => {
    expect(await store.hasHistory('env-1')).toBe(false);
    await store.append('env-1', {
      action: 'baseline',
      summary: 'a',
      versionBefore: null,
      versionAfter: 1,
      rolesBefore: [],
      rolesAfter: [],
    });
    expect(await store.hasHistory('env-1')).toBe(true);
  });

  it('prunes to the newest maxEntries', async () => {
    const small = new HistoryStore({ dir, maxEntries: 3 });
    for (let i = 0; i < 5; i += 1) {
      await small.append('env-1', {
        action: 'commit',
        summary: `change ${i}`,
        versionBefore: i,
        versionAfter: i + 1,
        rolesBefore: [],
        rolesAfter: [],
      });
    }
    const entries = await small.list('env-1');
    expect(entries).toHaveLength(3);
    expect(entries[0]?.summary).toBe('change 4');
    // and the file itself only holds three lines
    const raw = await readFile(path.join(dir, 'env-1.jsonl'), 'utf8');
    expect(raw.trim().split('\n')).toHaveLength(3);
  });
});
