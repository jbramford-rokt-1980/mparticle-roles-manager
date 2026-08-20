import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { fixtureEnv, fixtureManifest, fixtureTasks } from '../../test/fixtures';
import { chooseOption, optionLabels } from '../../test/selectHelpers';
import { SelectedEnvProvider } from '../../state/SelectedEnvContext';
import { RoleEditorPage } from '../RoleEditorPage';

function givenApi() {
  mswServer.use(
    http.get('/api/environments', () => HttpResponse.json([fixtureEnv])),
    http.get('/api/environments/env-1/manifest', () => HttpResponse.json(fixtureManifest)),
    http.get('/api/environments/env-1/tasks', () => HttpResponse.json(fixtureTasks)),
  );
}

function renderEditor() {
  return renderWithProviders(
    <SelectedEnvProvider>
      <RoleEditorPage />
    </SelectedEnvProvider>,
  );
}

describe('RoleEditorPage', () => {
  it('lists existing roles in the dropdown with New role as a separate button', async () => {
    givenApi();
    renderEditor();
    const user = userEvent.setup();
    const options = await optionLabels(user, /^role$/i);
    expect(options.join(' ')).toContain('Ad Sales Analyst');
    expect(options.join(' ')).toContain('Marketing Manager');
    expect(options.join(' ')).not.toMatch(/new role/i);
    expect(screen.getByRole('button', { name: /new role/i })).toBeInTheDocument();
  });

  it('clears the form when New role is clicked', async () => {
    givenApi();
    renderEditor();
    const user = userEvent.setup();
    await chooseOption(user, /^role$/i, /Ad Sales Analyst/);
    expect((screen.getByLabelText(/^name/i) as HTMLInputElement).value).toBe('Ad Sales Analyst');

    await user.click(screen.getByRole('button', { name: /new role/i }));
    expect((screen.getByLabelText(/^name/i) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('checkbox', { name: /audiences — view/i })).not.toBeChecked();
  });

  it('shows an empty state instead of a dropdown when the org has no roles', async () => {
    mswServer.use(
      http.get('/api/environments', () => HttpResponse.json([fixtureEnv])),
      http.get('/api/environments/env-1/manifest', () =>
        HttpResponse.json({ roles: [], version: 1 }),
      ),
      http.get('/api/environments/env-1/tasks', () => HttpResponse.json(fixtureTasks)),
    );
    renderEditor();
    expect(await screen.findByText(/no custom roles/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^role$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new role/i })).toBeInTheDocument();
  });

  it('pre-sets the permission grid from the selected role', async () => {
    givenApi();
    renderEditor();
    const user = userEvent.setup();
    await chooseOption(user, /^role$/i, /Ad Sales Analyst/);

    expect(await screen.findByRole('checkbox', { name: /audiences — view/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /audiences — full access/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /data plans — view/i })).not.toBeChecked();

    const name = screen.getByLabelText(/^name/i) as HTMLInputElement;
    expect(name.value).toBe('Ad Sales Analyst');
  });

  it('always shows the core permission as included and locked', async () => {
    givenApi();
    renderEditor();
    const core = await screen.findByRole('checkbox', { name: /core access/i });
    expect(core).toBeChecked();
    expect(core).toBeDisabled();
  });

  it('checking full access unchecks the other options in that feature', async () => {
    givenApi();
    renderEditor();
    const user = userEvent.setup();
    await chooseOption(user, /^role$/i, /Ad Sales Analyst/);

    const view = await screen.findByRole('checkbox', { name: /audiences — view/i });
    expect(view).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /audiences — full access/i }));
    expect(view).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /audiences — full access/i })).toBeChecked();
  });

  it('saves through plan → diff preview → commit', async () => {
    givenApi();
    const planResponse = {
      proposedRoles: [{ role_id: 'brand-new', name: 'Brand New', description: '', tasks: [] }],
      baseVersion: 4,
      diff: {
        created: [{ role_id: 'brand-new', name: 'Brand New', description: '', tasks: ['user:core'] }],
        deleted: [],
        modified: [],
        unchanged: [],
        summary: { createdCount: 1, modifiedCount: 0, deletedCount: 0, unchangedCount: 2 },
      },
      warnings: [],
    };
    let committed: Record<string, unknown> | undefined;
    mswServer.use(
      http.post('/api/environments/env-1/roles/plan', () => HttpResponse.json(planResponse)),
      http.post('/api/environments/env-1/roles/commit', async ({ request }) => {
        committed = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ roles: planResponse.proposedRoles, version: 5 });
      }),
    );

    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /new role/i }));
    await user.type(screen.getByLabelText(/^name/i), 'Brand New');
    await user.type(screen.getByLabelText(/^role id/i), 'brand-new');
    await user.click(screen.getByRole('checkbox', { name: /audiences — view/i }));
    await user.click(screen.getByRole('button', { name: /review changes/i }));

    // Diff preview shows before anything is written
    expect(await screen.findByText(/1 created/i)).toBeInTheDocument();
    expect(committed).toBeUndefined();

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    await screen.findByText(/saved/i);
    expect(committed).toEqual({
      proposedRoles: planResponse.proposedRoles,
      baseVersion: 4,
    });
  });
});
