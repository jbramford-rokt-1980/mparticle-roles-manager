import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { fixtureEnv } from '../../test/fixtures';
import { SelectedEnvProvider } from '../../state/SelectedEnvContext';
import { HistoryPage } from '../HistoryPage';

const entries = [
  {
    id: 'entry-2',
    timestamp: '2026-08-20T12:00:00.000Z',
    action: 'commit',
    summary: '0 created · 0 modified · 1 deleted',
    versionBefore: 1,
    versionAfter: 2,
    roleCountBefore: 4,
    roleCountAfter: 3,
  },
  {
    id: 'entry-1',
    timestamp: '2026-08-20T10:00:00.000Z',
    action: 'baseline',
    summary: 'Initial snapshot of the org’s roles',
    versionBefore: null,
    versionAfter: 1,
    roleCountBefore: 0,
    roleCountAfter: 4,
  },
];

function givenApi() {
  mswServer.use(
    http.get('/api/environments', () => HttpResponse.json([fixtureEnv])),
    http.get('/api/environments/env-1/history', () => HttpResponse.json(entries)),
  );
}

describe('HistoryPage', () => {
  it('lists history entries newest first with summaries and versions', async () => {
    givenApi();
    renderWithProviders(
      <SelectedEnvProvider>
        <HistoryPage />
      </SelectedEnvProvider>,
    );
    expect(await screen.findByText(/1 deleted/)).toBeInTheDocument();
    expect(screen.getByText(/initial snapshot/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /restore/i })).toHaveLength(2);
  });

  it('restores through plan → diff preview → commit', async () => {
    givenApi();
    let plannedIntent: Record<string, unknown> | undefined;
    let committed = false;
    mswServer.use(
      http.post('/api/environments/env-1/roles/plan', async ({ request }) => {
        plannedIntent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          proposedRoles: [],
          baseVersion: 2,
          diff: {
            created: [{ role_id: 'restored', name: 'Restored', description: '', tasks: [] }],
            deleted: [],
            modified: [],
            unchanged: [],
            summary: { createdCount: 1, modifiedCount: 0, deletedCount: 0, unchangedCount: 3 },
          },
          warnings: [],
        });
      }),
      http.post('/api/environments/env-1/roles/commit', () => {
        committed = true;
        return HttpResponse.json({ roles: [], version: 3 });
      }),
    );

    renderWithProviders(
      <SelectedEnvProvider>
        <HistoryPage />
      </SelectedEnvProvider>,
    );
    const user = userEvent.setup();
    const restoreButtons = await screen.findAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[1]!);

    expect(await screen.findByText(/1 created/)).toBeInTheDocument();
    expect(plannedIntent).toEqual({ type: 'restoreSnapshot', historyEntryId: 'entry-1' });
    expect(committed).toBe(false);

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(committed).toBe(true));
  });
});
