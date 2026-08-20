import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { fixtureEnv, fixtureManifest, fixtureTasks } from '../../test/fixtures';
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
    const select = await screen.findByLabelText(/^role$/i);
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['Ad Sales Analyst', 'Marketing Manager']));
    expect(options.join(' ')).not.toMatch(/new role/i);
    expect(screen.getByRole('button', { name: /new role/i })).toBeInTheDocument();
  });

  it('clears the form when New role is clicked', async () => {
    givenApi();
    renderEditor();
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/^role$/i), 'ad-sales-analyst');
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
    await user.selectOptions(await screen.findByLabelText(/^role$/i), 'ad-sales-analyst');

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
});
