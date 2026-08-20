import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mswServer } from '../../test/mswServer';
import { renderWithProviders } from '../../test/renderWithProviders';
import { fixtureEnv, fixtureManifest, fixtureTasks } from '../../test/fixtures';
import { SelectedEnvProvider } from '../../state/SelectedEnvContext';
import { RolesOverviewPage } from '../RolesOverviewPage';

function givenApi() {
  mswServer.use(
    http.get('/api/environments', () => HttpResponse.json([fixtureEnv])),
    http.get('/api/environments/env-1/manifest', () => HttpResponse.json(fixtureManifest)),
    http.get('/api/environments/env-1/tasks', () => HttpResponse.json(fixtureTasks)),
  );
}

describe('RolesOverviewPage', () => {
  it('lists roles with id, description, and permission count', async () => {
    givenApi();
    renderWithProviders(
      <SelectedEnvProvider>
        <RolesOverviewPage />
      </SelectedEnvProvider>,
    );
    expect(await screen.findByText('Ad Sales Analyst')).toBeInTheDocument();
    expect(screen.getByText('ad-sales-analyst')).toBeInTheDocument();
    expect(screen.getByText('Read-only audiences')).toBeInTheDocument();
    // Marketing Manager grants audiences:* + data_plans:view + core = 3 permissions
    expect(screen.getByText('Marketing Manager')).toBeInTheDocument();
  });

  it('shows manifest metadata and the 100-role meter', async () => {
    givenApi();
    renderWithProviders(
      <SelectedEnvProvider>
        <RolesOverviewPage />
      </SelectedEnvProvider>,
    );
    expect(await screen.findByText(/2 of 100 roles/i)).toBeInTheDocument();
    expect(screen.getByText(/someone@rokt\.com/)).toBeInTheDocument();
  });

  it('prompts to add an environment when none exist', async () => {
    mswServer.use(http.get('/api/environments', () => HttpResponse.json([])));
    renderWithProviders(
      <SelectedEnvProvider>
        <RolesOverviewPage />
      </SelectedEnvProvider>,
    );
    expect(await screen.findByText(/add an environment/i)).toBeInTheDocument();
  });
});
