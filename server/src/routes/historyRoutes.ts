import type { FastifyInstance } from 'fastify';

import { ApiError } from '../plugins/apiError';
import { findEnvironment } from './environmentRoutes';

export function registerHistoryRoutes(app: FastifyInstance): void {
  // History routes live under /api/environments so the vault guard covers them.
  app.get<{ Params: { id: string } }>('/api/environments/:id/history', async (req) => {
    const env = findEnvironment(app, req.params.id);
    const entries = await app.history.list(env.id);
    // Keep the list light — full role snapshots only on the detail endpoint.
    return entries.map(({ rolesBefore, rolesAfter, ...meta }) => ({
      ...meta,
      roleCountBefore: rolesBefore.length,
      roleCountAfter: rolesAfter.length,
    }));
  });

  app.get<{ Params: { id: string; entryId: string } }>(
    '/api/environments/:id/history/:entryId',
    async (req) => {
      const env = findEnvironment(app, req.params.id);
      const entry = await app.history.get(env.id, req.params.entryId);
      if (!entry) throw new ApiError('NOT_FOUND', 404, 'Unknown history entry');
      return entry;
    },
  );
}
