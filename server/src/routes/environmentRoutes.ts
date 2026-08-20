import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import { POD_IDS, type EnvironmentConfig, type EnvironmentInput } from '@roles/shared';

import { ApiError } from '../plugins/apiError';
import { maskEnvironment } from '../util/mask';

const environmentBodySchema = {
  type: 'object',
  required: ['label', 'pod', 'orgId', 'accountId', 'clientId'],
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 120 },
    pod: { type: 'string', enum: [...POD_IDS] },
    orgId: { type: 'integer', minimum: 0 },
    accountId: { type: 'integer', minimum: 0 },
    clientId: { type: 'string', minLength: 1 },
    clientSecret: { type: 'string', minLength: 1 },
  },
} as const;

export function requireUnlockedVault(app: FastifyInstance): void {
  if (!app.vault.isUnlocked()) {
    throw new ApiError('VAULT_LOCKED', 401, 'Unlock the vault to continue');
  }
}

export function findEnvironment(app: FastifyInstance, id: string): EnvironmentConfig {
  const env = app.vault.getEnvironments().find((e) => e.id === id);
  if (!env) throw new ApiError('NOT_FOUND', 404, 'Unknown environment');
  return env;
}

export function registerEnvironmentRoutes(app: FastifyInstance): void {
  app.addHook('preHandler', async (req) => {
    if (req.url.startsWith('/api/environments') || req.url.startsWith('/api/roles')) {
      requireUnlockedVault(app);
    }
  });

  app.get('/api/environments', async () =>
    app.vault.getEnvironments().map(maskEnvironment),
  );

  app.post<{ Body: EnvironmentInput }>(
    '/api/environments',
    { schema: { body: { ...environmentBodySchema, required: [...environmentBodySchema.required, 'clientSecret'] } } },
    async (req) => {
      const now = new Date().toISOString();
      const env: EnvironmentConfig = {
        id: randomUUID(),
        label: req.body.label,
        pod: req.body.pod,
        orgId: req.body.orgId,
        accountId: req.body.accountId,
        clientId: req.body.clientId,
        clientSecret: req.body.clientSecret ?? '',
        createdAt: now,
        updatedAt: now,
      };
      await app.vault.setEnvironments([...app.vault.getEnvironments(), env]);
      return maskEnvironment(env);
    },
  );

  app.put<{ Body: EnvironmentInput; Params: { id: string } }>(
    '/api/environments/:id',
    { schema: { body: environmentBodySchema } },
    async (req) => {
      const existing = findEnvironment(app, req.params.id);
      const updated: EnvironmentConfig = {
        ...existing,
        label: req.body.label,
        pod: req.body.pod,
        orgId: req.body.orgId,
        accountId: req.body.accountId,
        clientId: req.body.clientId,
        // Omitted secret on update = keep the stored one.
        clientSecret: req.body.clientSecret ?? existing.clientSecret,
        updatedAt: new Date().toISOString(),
      };
      await app.vault.setEnvironments(
        app.vault.getEnvironments().map((e) => (e.id === updated.id ? updated : e)),
      );
      return maskEnvironment(updated);
    },
  );

  app.delete<{ Params: { id: string } }>('/api/environments/:id', async (req) => {
    findEnvironment(app, req.params.id);
    await app.vault.setEnvironments(
      app.vault.getEnvironments().filter((e) => e.id !== req.params.id),
    );
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/environments/:id/test', async (req) => {
    const env = findEnvironment(app, req.params.id);
    const tasks = await app.rolesApi.getTasks(env);
    return { ok: true, taskCount: tasks.length };
  });
}
