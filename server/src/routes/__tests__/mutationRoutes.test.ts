import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const TASKS = [
  { task_id: 'user:core', display_name: null, description: null },
  { task_id: 'audiences:view', display_name: null, description: null },
  { task_id: 'audiences:*', display_name: null, description: null },
];

/** Stateful fake of the mParticle API: GETs serve state, PUT replaces it. */
class FakeUpstream {
  roles: Role[] = [
    { role_id: 'existing', name: 'Existing', description: '', tasks: [{ task_id: 'audiences:view' }] },
  ];
  version = 7;
  putBodies: unknown[] = [];
  failPutWith: { status: number; body: string } | null = null;

  fetchFn = vi.fn().mockImplementation((url: string, init: RequestInit) => {
    if (url.includes('sso.auth')) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: 't', expires_in: 28800 }), { status: 200 }),
      );
    }
    if (url.endsWith('/tasks')) {
      return Promise.resolve(new Response(JSON.stringify(TASKS), { status: 200 }));
    }
    if (init.method === 'PUT') {
      if (this.failPutWith) {
        return Promise.resolve(
          new Response(this.failPutWith.body, { status: this.failPutWith.status }),
        );
      }
      const body = JSON.parse(init.body as string) as { roles: Role[]; version?: number };
      this.putBodies.push(body);
      this.roles = body.roles;
      this.version += 1;
      return Promise.resolve(new Response(JSON.stringify(this.manifest()), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(this.manifest()), { status: 200 }));
  });

  manifest() {
    return {
      roles: this.roles,
      last_modified_on: '2026-08-01T00:00:00Z',
      last_modified_by: 'x',
      version: this.version,
    };
  }
}

describe('plan/commit mutation routes', () => {
  let dir: string;
  let app: ReturnType<typeof buildApp>;
  let upstream: FakeUpstream;
  let envId: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'mutation-routes-'));
    upstream = new FakeUpstream();
    app = buildApp({
      vaultPath: path.join(dir, 'vault.enc.json'),
      idleLockMinutes: 0,
      kdf,
      fetchFn: upstream.fetchFn,
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

  function plan(intent: unknown) {
    return app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/plan`,
      payload: intent as Record<string, unknown>,
    });
  }

  it('plans an upsert: fresh manifest + diff + baseVersion, and never PUTs', async () => {
    const res = await plan({
      type: 'upsertRole',
      role: { role_id: 'new-role', name: 'New Role', description: '', tasks: [{ task_id: 'audiences:*' }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      proposedRoles: Role[];
      baseVersion: number;
      diff: { summary: { createdCount: number } };
    };
    expect(body.baseVersion).toBe(7);
    expect(body.proposedRoles.map((r) => r.role_id).sort()).toEqual(['existing', 'new-role']);
    expect(body.diff.summary.createdCount).toBe(1);
    expect(upstream.putBodies).toHaveLength(0);
  });

  it('rejects an invalid plan with field errors', async () => {
    const res = await plan({
      type: 'upsertRole',
      role: { role_id: 'bad', name: 'x'.repeat(65), tasks: [{ task_id: 'nope:*' }] },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { code: string; details: { field: string }[] };
    expect(body.code).toBe('VALIDATION');
    expect(body.details.map((d) => d.field)).toEqual(expect.arrayContaining(['name', 'tasks']));
  });

  it('404s when planning to delete a role that does not exist', async () => {
    const res = await plan({ type: 'deleteRole', roleId: 'ghost' });
    expect(res.statusCode).toBe(404);
  });

  it('commits by PUTting exactly {roles, version} and returns the fresh manifest', async () => {
    const planned = (await plan({
      type: 'upsertRole',
      role: { role_id: 'new-role', name: 'New Role', description: '', tasks: [{ task_id: 'audiences:*' }] },
    })).json() as { proposedRoles: Role[]; baseVersion: number };

    const res = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/commit`,
      payload: { proposedRoles: planned.proposedRoles, baseVersion: planned.baseVersion },
    });

    expect(res.statusCode).toBe(200);
    expect(upstream.putBodies).toHaveLength(1);
    expect(upstream.putBodies[0]).toEqual({ roles: planned.proposedRoles, version: 7 });
    expect((res.json() as { version: number }).version).toBe(8);
  });

  it('refuses to commit when the manifest changed since planning', async () => {
    const planned = (await plan({ type: 'deleteRole', roleId: 'existing' })).json() as {
      proposedRoles: Role[];
      baseVersion: number;
    };

    upstream.version = 9; // someone else changed the org in between

    const res = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/commit`,
      payload: { proposedRoles: planned.proposedRoles, baseVersion: planned.baseVersion },
    });

    expect(res.statusCode).toBe(409);
    expect((res.json() as { code: string }).code).toBe('VERSION_CONFLICT');
    expect(upstream.putBodies).toHaveLength(0);
  });

  it('maps an assigned-role 400 from the PUT to ASSIGNED_ROLE_DELETE', async () => {
    const planned = (await plan({ type: 'deleteRole', roleId: 'existing' })).json() as {
      proposedRoles: Role[];
      baseVersion: number;
    };
    upstream.failPutWith = {
      status: 400,
      body: 'Custom role is assigned to a user and may not be deleted',
    };

    const res = await app.inject({
      method: 'POST',
      url: `/api/environments/${envId}/roles/commit`,
      payload: { proposedRoles: planned.proposedRoles, baseVersion: planned.baseVersion },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { code: string }).code).toBe('ASSIGNED_ROLE_DELETE');
  });
});
