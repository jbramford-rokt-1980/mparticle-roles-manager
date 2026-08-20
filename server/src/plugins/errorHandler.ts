import type { FastifyInstance } from 'fastify';

import { VaultDecryptError } from '../vault/vaultFile';
import { VaultLockedError } from '../vault/vaultSession';
import { ApiError } from './apiError';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      if (err.retryAfter !== undefined) reply.header('retry-after', String(err.retryAfter));
      return reply.status(err.httpStatus).send(err.toBody());
    }
    if (err instanceof VaultDecryptError) {
      return reply
        .status(401)
        .send(new ApiError('VAULT_BAD_PASSPHRASE', 401, err.message).toBody());
    }
    if (err instanceof VaultLockedError) {
      return reply
        .status(401)
        .send(new ApiError('VAULT_LOCKED', 401, 'Unlock the vault to continue').toBody());
    }
    // Fastify schema-validation failures carry a validation array.
    if ('validation' in err && err.validation) {
      return reply
        .status(400)
        .send(new ApiError('VALIDATION', 400, err.message, { details: err.validation }).toBody());
    }
    _req.log.error(err);
    return reply.status(500).send(new ApiError('INTERNAL', 500, 'Internal error').toBody());
  });
}
