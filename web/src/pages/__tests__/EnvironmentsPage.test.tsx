import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MaskedEnvironment } from '@roles/shared';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { EnvironmentsPage } from '../EnvironmentsPage';

const demoEnv: MaskedEnvironment = {
  id: 'env-1',
  label: 'Demo Org EU1',
  pod: 'eu1',
  orgId: 100,
  accountId: 200,
  clientId: 'client-abc',
  clientSecretMasked: '••••4321',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

function givenEnvironments(envs: MaskedEnvironment[]) {
  mswServer.use(http.get('/api/environments', () => HttpResponse.json(envs)));
}

describe('EnvironmentsPage', () => {
  it('lists environments with pod badge and masked secret', async () => {
    givenEnvironments([demoEnv]);
    renderWithProviders(<EnvironmentsPage />);
    expect(await screen.findByText('Demo Org EU1')).toBeInTheDocument();
    expect(screen.getByText('EU1')).toBeInTheDocument();
    expect(screen.getByText('••••4321')).toBeInTheDocument();
  });

  it('creates an environment through the add form', async () => {
    givenEnvironments([]);
    let posted: Record<string, unknown> | undefined;
    mswServer.use(
      http.post('/api/environments', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...demoEnv, id: 'new-id' });
      }),
    );
    renderWithProviders(<EnvironmentsPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /add environment/i }));
    await user.type(screen.getByLabelText(/label/i), 'King US1');
    await user.selectOptions(screen.getByLabelText(/pod/i), 'us1');
    await user.type(screen.getByLabelText(/org id/i), '77');
    await user.type(screen.getByLabelText(/account id/i), '88');
    await user.type(screen.getByLabelText(/client id/i), 'cid-1');
    await user.type(screen.getByLabelText(/client secret/i), 'secret-value');
    await user.click(screen.getByRole('button', { name: /save environment/i }));

    await waitFor(() =>
      expect(posted).toEqual({
        label: 'King US1',
        pod: 'us1',
        orgId: 77,
        accountId: 88,
        clientId: 'cid-1',
        clientSecret: 'secret-value',
      }),
    );
  });

  it('runs a connection test and shows the result', async () => {
    givenEnvironments([demoEnv]);
    mswServer.use(
      http.post('/api/environments/env-1/test', () =>
        HttpResponse.json({ ok: true, taskCount: 34 }),
      ),
    );
    renderWithProviders(<EnvironmentsPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/connected.*34/i)).toBeInTheDocument();
  });

  it('requires a second click to delete', async () => {
    givenEnvironments([demoEnv]);
    let deleted = false;
    mswServer.use(
      http.delete('/api/environments/env-1', () => {
        deleted = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    renderWithProviders(<EnvironmentsPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    expect(deleted).toBe(false);
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));
    await waitFor(() => expect(deleted).toBe(true));
  });
});
