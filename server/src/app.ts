import path from 'node:path';

import cors from '@fastify/cors';
import Fastify from 'fastify';
import { fetch as undiciFetch } from 'undici';

import { TokenManager } from './auth/tokenManager';
import { config } from './config';
import { MParticleHttpClient } from './mparticle/httpClient';
import { MockRolesApi } from './mparticle/mockRolesApi';
import { RolesApi, type RolesApiLike } from './mparticle/rolesApi';
import { registerErrorHandler } from './plugins/errorHandler';
import { registerEnvironmentRoutes } from './routes/environmentRoutes';
import { registerRolesRoutes } from './routes/rolesRoutes';
import { registerVaultRoutes } from './routes/vaultRoutes';
import type { KdfParams } from './vault/vaultFile';
import { VaultSession } from './vault/vaultSession';

declare module 'fastify' {
  interface FastifyInstance {
    vault: VaultSession;
    tokens: TokenManager;
    rolesApi: RolesApiLike;
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

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
  /** Injected in tests; defaults to undici fetch so mocks can intercept. */
  fetchFn?: FetchLike;
  /** Serve a seeded in-memory fake instead of the real mParticle API. */
  mockMparticle?: boolean;
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

  const fetchFn = options.fetchFn ?? (undiciFetch as unknown as FetchLike);
  const tokens = new TokenManager({ fetchFn });

  const vault = new VaultSession({
    vaultPath: options.vaultPath ?? path.join(config.dataDir, 'vault.enc.json'),
    idleLockMinutes: options.idleLockMinutes ?? config.idleLockMinutes,
    kdf: options.kdf,
    // Locking drops cached bearer tokens along with the credentials.
    onLock: () => tokens.clear(),
  });

  const mock = options.mockMparticle ?? config.mockMparticle;
  const rolesApi: RolesApiLike = mock
    ? new MockRolesApi()
    : new RolesApi(new MParticleHttpClient({ tokens, fetchFn }));

  app.decorate('vault', vault);
  app.decorate('tokens', tokens);
  app.decorate('rolesApi', rolesApi);

  // Any authenticated activity keeps the vault awake.
  app.addHook('onRequest', async () => {
    vault.touch();
  });

  app.register(cors, { origin: [...config.corsOrigins] });

  registerErrorHandler(app);
  registerVaultRoutes(app);
  registerEnvironmentRoutes(app);
  registerRolesRoutes(app);

  app.get('/api/healthz', async () => ({ ok: true, mock }));

  return app;
}
