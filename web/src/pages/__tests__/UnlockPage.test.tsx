import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { UnlockPage } from '../UnlockPage';

function givenVaultStatus(status: 'uninitialized' | 'locked') {
  mswServer.use(
    http.get('/api/vault/status', () => HttpResponse.json({ status })),
  );
}

describe('UnlockPage', () => {
  it('shows the create-vault form when uninitialized', async () => {
    givenVaultStatus('uninitialized');
    renderWithProviders(<UnlockPage />);
    expect(await screen.findByRole('heading', { name: /create your vault/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^passphrase/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument();
  });

  it('blocks init when the confirmation does not match', async () => {
    givenVaultStatus('uninitialized');
    let initCalled = false;
    mswServer.use(
      http.post('/api/vault/init', () => {
        initCalled = true;
        return HttpResponse.json({ status: 'unlocked' });
      }),
    );
    renderWithProviders(<UnlockPage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^passphrase/i), 'a-long-passphrase');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'different-thing');
    await user.click(screen.getByRole('button', { name: /create vault/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(initCalled).toBe(false);
  });

  it('creates the vault when passphrases match', async () => {
    givenVaultStatus('uninitialized');
    let receivedPassphrase: string | undefined;
    mswServer.use(
      http.post('/api/vault/init', async ({ request }) => {
        const body = (await request.json()) as { passphrase: string };
        receivedPassphrase = body.passphrase;
        return HttpResponse.json({ status: 'unlocked' });
      }),
    );
    renderWithProviders(<UnlockPage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^passphrase/i), 'a-long-passphrase');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'a-long-passphrase');
    await user.click(screen.getByRole('button', { name: /create vault/i }));
    await waitFor(() => expect(receivedPassphrase).toBe('a-long-passphrase'));
  });

  it('shows the unlock form when locked and surfaces a bad passphrase', async () => {
    givenVaultStatus('locked');
    mswServer.use(
      http.post('/api/vault/unlock', () =>
        HttpResponse.json(
          {
            code: 'VAULT_BAD_PASSPHRASE',
            httpStatus: 401,
            message: 'Vault could not be decrypted: wrong passphrase or corrupted file',
          },
          { status: 401 },
        ),
      ),
    );
    renderWithProviders(<UnlockPage />);
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /unlock/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^passphrase/i), 'wrong-passphrase');
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText(/wrong passphrase/i)).toBeInTheDocument();
  });
});
