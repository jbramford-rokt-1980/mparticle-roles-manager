import cors from '@fastify/cors';
import Fastify from 'fastify';

import { config } from './config';

/** Pino redaction paths — secrets must never reach a log line. */
const REDACT_PATHS = [
  'req.headers.authorization',
  '*.client_secret',
  '*.clientSecret',
  '*.passphrase',
  '*.access_token',
];

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    },
  });

  app.register(cors, { origin: [...config.corsOrigins] });

  app.get('/api/healthz', async () => ({ ok: true, mock: config.mockMparticle }));

  return app;
}
