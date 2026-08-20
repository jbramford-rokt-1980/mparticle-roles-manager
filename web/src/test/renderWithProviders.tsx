import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { createQueryClient } from '../api/queryClient';

export interface RenderOptions {
  /** Initial router entries, e.g. ['/roles/editor?role=x']. */
  initialEntries?: string[];
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
