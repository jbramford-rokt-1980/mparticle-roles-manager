import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadConfig() {
  vi.resetModules();
  const module = await import('../config');
  return module.config;
}

describe('config.dataDir', () => {
  beforeEach(() => {
    delete process.env.DATA_DIR;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('defaults to <repo>/data', async () => {
    const config = await loadConfig();
    expect(config.dataDir.endsWith(path.join('mparticle-roles-manager', 'data'))).toBe(true);
  });

  it('resolves a relative DATA_DIR against the repo root, not the working directory', async () => {
    // npm run -w server starts the process with cwd=server/, so a cwd-relative
    // resolve would silently write the vault to server/.guide-data.
    const serverCwd = path.join(process.cwd(), 'server');
    vi.spyOn(process, 'cwd').mockReturnValue(serverCwd);

    process.env.DATA_DIR = './.guide-data';
    const config = await loadConfig();

    expect(config.dataDir.endsWith(path.join('mparticle-roles-manager', '.guide-data'))).toBe(true);
    expect(config.dataDir).not.toContain(`${path.sep}server${path.sep}`);
  });

  it('honours an absolute DATA_DIR unchanged', async () => {
    process.env.DATA_DIR = '/tmp/some-vault-dir';
    const config = await loadConfig();
    expect(config.dataDir).toBe('/tmp/some-vault-dir');
  });
});
