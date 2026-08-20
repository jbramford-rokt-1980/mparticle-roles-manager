import { screen } from '@testing-library/react';
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
