import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Role } from '@roles/shared';

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

describe('history + rollback', () => {
  let dir: string;
  let app: ReturnType<typeof buildApp>;
  let envId: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'history-routes-'));
    // Mock mode gives us a stateful upstream with zero fetch plumbing.
    app = buildApp({
      vaultPath: path.join(dir, 'vault.enc.json'),
      historyDir: path.join(dir, 'history'),
      idleLockMinutes: 0,
      kdf,
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
    envId = (created.json() as { id: string }).id;
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function commitDelete(roleId: string) {
    const planned = (
      await app.inject({
        method: 'POST',
        url: `/api/environments/${envId}/roles/plan`,
        payload: { type: 'deleteRole', roleId },
      })
    ).json() as { proposedRoles: Role[]; baseVersion: number };
    return app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/commit`,
      payload: planned,
    });
  }

  it('records a baseline on first manifest fetch', async () => {
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` });
    const res = await app.inject({ method: 'GET', url: `/api/environments/${envId}/history` });
    const entries = res.json() as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('baseline');
    // List entries stay light — no full role snapshots.
    expect(entries[0]).not.toHaveProperty('rolesAfter');
    expect(entries[0]).toHaveProperty('roleCountAfter', 4);
  });

  it('records every successful commit with a change summary', async () => {
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` });
    await commitDelete('agency-partner');

    const entries = (
      await app.inject({ method: 'GET', url: `/api/environments/${envId}/history` })
    ).json() as Array<{ action: string; summary: string }>;
    expect(entries[0]?.action).toBe('commit');
    expect(entries[0]?.summary).toMatch(/1 deleted/);
  });

  it('rolls back through the same plan/commit pipeline', async () => {
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` });
    await commitDelete('agency-partner');

    const entries = (
      await app.inject({ method: 'GET', url: `/api/environments/${envId}/history` })
    ).json() as Array<{ id: string; action: string }>;
    const baseline = entries.find((e) => e.action === 'baseline');

    const planned = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/plan`,
      payload: { type: 'restoreSnapshot', historyEntryId: baseline?.id },
    });
    expect(planned.statusCode).toBe(200);
    const planBody = planned.json() as {
      proposedRoles: Role[];
      baseVersion: number;
      diff: { summary: { createdCount: number } };
    };
    // Restoring the baseline recreates the deleted role
    expect(planBody.diff.summary.createdCount).toBe(1);

    const committed = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/commit`,
      payload: planBody,
    });
    expect(committed.statusCode).toBe(200);

    const manifest = (
      await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` })
    ).json() as { roles: Role[] };
    expect(manifest.roles.map((r) => r.role_id)).toContain('agency-partner');
  });

  it('404s when restoring an unknown history entry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/plan`,
      payload: { type: 'restoreSnapshot', historyEntryId: 'ghost' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('serves the full snapshot on the detail endpoint', async () => {
    await app.inject({ method: 'GET', url: `/api/environments/${envId}/manifest` });
    const entries = (
      await app.inject({ method: 'GET', url: `/api/environments/${envId}/history` })
    ).json() as Array<{ id: string }>;
    const detail = await app.inject({
      method: 'GET',
      url: `/api/environments/${envId}/history/${entries[0]?.id}`,
    });
    expect(detail.statusCode).toBe(200);
    expect((detail.json() as { rolesAfter: Role[] }).rolesAfter.length).toBe(4);
  });
});
