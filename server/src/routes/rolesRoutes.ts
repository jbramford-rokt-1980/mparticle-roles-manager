import type { FastifyInstance } from 'fastify';

import {
  CORE_TASK,
  diffManifests,
  validateRole,
  type EnvironmentConfig,
  type Manifest,
  type MutationIntent,
  type Role,
  type TaskDef,
} from '@roles/shared';

import { ApiError } from '../plugins/apiError';
import { findEnvironment } from './environmentRoutes';

const TASKS_CACHE_MS = 10 * 60 * 1000;

interface CachedTasks {
  tasks: TaskDef[];
  fetchedAt: number;
}

export function registerRolesRoutes(app: FastifyInstance): void {
  const tasksCache = new Map<string, CachedTasks>();

  app.get<{ Params: { id: string } }>('/api/environments/:id/tasks', async (req) => {
    const env = findEnvironment(app, req.params.id);
    const cached = tasksCache.get(env.id);
    if (cached && Date.now() - cached.fetchedAt < TASKS_CACHE_MS) {
      return cached.tasks;
    }
    const tasks = await app.rolesApi.getTasks(env);
    tasksCache.set(env.id, { tasks, fetchedAt: Date.now() });
    return tasks;
  });

  app.get<{ Params: { id: string } }>('/api/environments/:id/manifest', async (req) => {
    const env = findEnvironment(app, req.params.id);
    return app.rolesApi.getManifest(env);
  });

  /**
   * Two-phase mutation. The UI never constructs the PUT body:
   * plan = fresh GET + apply intent + validate + diff; commit = re-GET,
   * version check, then the full-replace PUT.
   */
  app.post<{ Params: { id: string }; Body: MutationIntent }>(
    '/api/environments/:id/roles/plan',
    async (req) => {
      const env = findEnvironment(app, req.params.id);
      const manifest = await app.rolesApi.getManifest(env);
      const proposedRoles = await applyIntent(app, env, manifest, req.body);
      const warnings: string[] = [];
      if (manifest.version === undefined) {
        warnings.push(
          'This org returns no manifest version — concurrent edits cannot be detected.',
        );
      }
      return {
        proposedRoles,
        baseVersion: manifest.version ?? null,
        diff: diffManifests(manifest.roles, proposedRoles),
        warnings,
      };
    },
  );

  app.post<{
    Params: { id: string };
    Body: { proposedRoles: Role[]; baseVersion: Manifest['version'] | null };
  }>('/api/environments/:id/roles/commit', async (req) => {
    const env = findEnvironment(app, req.params.id);
    const { proposedRoles, baseVersion } = req.body;
    if (!Array.isArray(proposedRoles)) {
      throw new ApiError('VALIDATION', 400, 'proposedRoles must be an array');
    }

    const fresh = await app.rolesApi.getManifest(env);
    if (fresh.version !== undefined && baseVersion !== null && fresh.version !== baseVersion) {
      throw new ApiError(
        'VERSION_CONFLICT',
        409,
        `The org's roles changed since you reviewed this diff` +
          (fresh.last_modified_by ? ` (last modified by ${fresh.last_modified_by})` : '') +
          '. Nothing was written — review the refreshed diff and confirm again.',
      );
    }

    return app.rolesApi.putManifest(env, proposedRoles, fresh.version);
  });
}

/** Ensure the mandatory core task is present exactly once. */
function withCoreTask(role: Role): Role {
  const seen = new Set<string>();
  const tasks = [{ task_id: CORE_TASK }, ...role.tasks]
    .filter((t) => {
      const id = t.task_id.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((t) => ({ task_id: t.task_id.trim() }));
  return {
    role_id: role.role_id.trim(),
    name: role.name.trim(),
    description: (role.description ?? '').trim(),
    tasks,
  };
}

async function applyIntent(
  app: FastifyInstance,
  env: EnvironmentConfig,
  manifest: Manifest,
  intent: MutationIntent,
): Promise<Role[]> {
  if (intent.type === 'upsertRole') {
    const role = withCoreTask(intent.role);
    const others = manifest.roles.filter((r) => r.role_id !== role.role_id);
    const isEdit = others.length !== manifest.roles.length;
    const tasks = await app.rolesApi.getTasks(env);
    const errors = validateRole(role, {
      // On edit the id stays its own; only collisions with OTHER roles matter.
      existingRoleIds: isEdit ? new Set() : new Set(others.map((r) => r.role_id)),
      validTaskIds: new Set(tasks.map((t) => t.task_id)),
      totalRolesAfter: others.length + 1,
    });
    if (errors.length > 0) {
      throw new ApiError('VALIDATION', 400, 'The role fails validation', { details: errors });
    }
    return [...others, role];
  }

  if (intent.type === 'deleteRole') {
    if (!manifest.roles.some((r) => r.role_id === intent.roleId)) {
      throw new ApiError('NOT_FOUND', 404, `No role with ID "${intent.roleId}" in this org`);
    }
    return manifest.roles.filter((r) => r.role_id !== intent.roleId);
  }

  // restoreSnapshot arrives with the history milestone.
  throw new ApiError('VALIDATION', 400, `Unsupported intent type`);
}
