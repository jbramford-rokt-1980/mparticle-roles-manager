import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { App } from '../App';
import { mswServer } from '../test/mswServer';
import { renderWithProviders } from '../test/renderWithProviders';

describe('App', () => {
  it('shows a server-down notice when the local proxy is unreachable', async () => {
    mswServer.use(
      http.get('/api/vault/status', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<App />);
    expect(
      await screen.findByRole('heading', { name: /local server unreachable/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('routes to the unlock screen when the vault is locked', async () => {
    mswServer.use(
      http.get('/api/vault/status', () => HttpResponse.json({ status: 'locked' })),
    );
    renderWithProviders(<App />);
    expect(await screen.findByRole('heading', { name: /unlock/i })).toBeInTheDocument();
  });

  it('returns to the unlock screen immediately after Lock vault is clicked', async () => {
    const { fixtureEnv, fixtureManifest } = await import('../test/fixtures');
    let locked = false;
    mswServer.use(
      http.get('/api/vault/status', () =>
        HttpResponse.json({ status: locked ? 'locked' : 'unlocked' }),
      ),
      http.get('/api/environments', () => HttpResponse.json([fixtureEnv])),
      http.get('/api/environments/env-1/manifest', () => HttpResponse.json(fixtureManifest)),
      http.post('/api/vault/lock', () => {
        locked = true;
        return HttpResponse.json({ status: 'locked' });
      }),
    );

    renderWithProviders(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /lock vault/i }));

    expect(await screen.findByRole('heading', { name: /^unlock$/i })).toBeInTheDocument();
  });

  it('returns to the unlock screen when the vault locks mid-session (idle auto-lock)', async () => {
    let locked = false;
    mswServer.use(
      http.get('/api/vault/status', () =>
        HttpResponse.json({ status: locked ? 'locked' : 'unlocked' }),
      ),
      http.get('/api/environments', () => {
        locked = true;
        return HttpResponse.json(
          { code: 'VAULT_LOCKED', httpStatus: 401, message: 'Unlock the vault to continue' },
          { status: 401 },
        );
      }),
    );
    renderWithProviders(<App />);
    expect(await screen.findByRole('heading', { name: /unlock/i })).toBeInTheDocument();
  });
});
