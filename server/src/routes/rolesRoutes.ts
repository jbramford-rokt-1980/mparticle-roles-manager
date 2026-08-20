import type { FastifyInstance } from 'fastify';

import type { TaskDef } from '@roles/shared';

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
}
