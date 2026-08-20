import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  /** The proxy must never be reachable off-machine. */
  host: '127.0.0.1',
  // Deliberately NOT plain `PORT` — dev harnesses inject that for the web server.
  port: intFromEnv('ROLES_PROXY_PORT', 8931),
  // Relative paths resolve against the repo root, not the process cwd — the
  // server workspace runs with cwd=server/, so plain resolve() would put the
  // vault somewhere the user never looks. Absolute paths pass through.
  dataDir: process.env.DATA_DIR
    ? path.resolve(repoRoot, process.env.DATA_DIR)
    : path.join(repoRoot, 'data'),
  idleLockMinutes: intFromEnv('IDLE_LOCK_MINUTES', 30),
  mockMparticle: process.env.MOCK_MPARTICLE === '1',
  /** Origins allowed to call the proxy (the Vite dev server). */
  corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
} as const;
