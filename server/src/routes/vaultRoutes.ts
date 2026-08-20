import type { FastifyInstance } from 'fastify';

import { ApiError } from '../plugins/apiError';

const passphraseSchema = {
  body: {
    type: 'object',
    required: ['passphrase'],
    additionalProperties: false,
    properties: {
      passphrase: { type: 'string', minLength: 8, maxLength: 512 },
    },
  },
} as const;

interface PassphraseBody {
  passphrase: string;
}

export function registerVaultRoutes(app: FastifyInstance): void {
  app.get('/api/vault/status', async () => ({ status: await app.vault.status() }));

  app.post<{ Body: PassphraseBody }>(
    '/api/vault/init',
    { schema: passphraseSchema },
    async (req) => {
      if ((await app.vault.status()) !== 'uninitialized') {
        throw new ApiError('VALIDATION', 409, 'Vault is already initialized — unlock it instead');
      }
      await app.vault.init(req.body.passphrase);
      return { status: 'unlocked' };
    },
  );

  app.post<{ Body: PassphraseBody }>(
    '/api/vault/unlock',
    { schema: passphraseSchema },
    async (req) => {
      await app.vault.unlock(req.body.passphrase);
      return { status: 'unlocked' };
    },
  );

  app.post('/api/vault/lock', async () => {
    app.vault.lock();
    return { status: 'locked' };
  });
}
