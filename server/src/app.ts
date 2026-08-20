import path from 'node:path';

import cors from '@fastify/cors';
import Fastify from 'fastify';

import { config } from './config';
import { registerErrorHandler } from './plugins/errorHandler';
import { registerVaultRoutes } from './routes/vaultRoutes';
import type { KdfParams } from './vault/vaultFile';
import { VaultSession } from './vault/vaultSession';

declare module 'fastify' {
  interface FastifyInstance {
    vault: VaultSession;
  }
}

/** Pino redaction paths — secrets must never reach a log line. */
const REDACT_PATHS = [
  'req.headers.authorization',
  '*.client_secret',
  '*.clientSecret',
  '*.passphrase',
  '*.access_token',
];

export interface BuildAppOptions {
  vaultPath?: string;
  idleLockMinutes?: number;
  kdf?: KdfParams;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            level: process.env.LOG_LEVEL ?? 'info',
            redact: { paths: REDACT_PATHS, censor: '[redacted]' },
          },
  });

  const vault = new VaultSession({
    vaultPath: options.vaultPath ?? path.join(config.dataDir, 'vault.enc.json'),
    idleLockMinutes: options.idleLockMinutes ?? config.idleLockMinutes,
    kdf: options.kdf,
  });
  app.decorate('vault', vault);

  // Any authenticated activity keeps the vault awake.
  app.addHook('onRequest', async () => {
    vault.touch();
  });

  app.register(cors, { origin: [...config.corsOrigins] });

  registerErrorHandler(app);
  registerVaultRoutes(app);

  app.get('/api/healthz', async () => ({ ok: true, mock: config.mockMparticle }));

  return app;
}
