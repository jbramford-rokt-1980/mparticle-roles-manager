import { describe, expect, it, vi } from 'vitest';

import type { EnvironmentConfig } from '@roles/shared';

import { RolesApi } from '../rolesApi';

const env = { orgId: 1, accountId: 2, pod: 'us1' } as EnvironmentConfig;

function makeClient() {
  return { request: vi.fn().mockResolvedValue({}) };
}

describe('RolesApi', () => {
  it('gets tasks and manifest from the two read endpoints', async () => {
    const client = makeClient();
    const api = new RolesApi(client);

    await api.getTasks(env);
    await api.getManifest(env);

    expect(client.request).toHaveBeenNthCalledWith(1, env, 'GET', '/tasks');
    expect(client.request).toHaveBeenNthCalledWith(2, env, 'GET', '/roles');
  });

  it('puts the full manifest with version when present', async () => {
    const client = makeClient();
    const api = new RolesApi(client);

    await api.putManifest(env, [{ role_id: 'r', name: 'R', tasks: [] }], 7);

    expect(client.request).toHaveBeenCalledWith(env, 'PUT', '/roles', {
      roles: [{ role_id: 'r', name: 'R', tasks: [] }],
      version: 7,
    });
  });

  it('omits version entirely when the manifest did not include one', async () => {
    const client = makeClient();
    const api = new RolesApi(client);

    await api.putManifest(env, [], undefined);

    const body = client.request.mock.calls[0]?.[3] as Record<string, unknown>;
    expect('version' in body).toBe(false);
  });
});
