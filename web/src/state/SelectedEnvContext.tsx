import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { MaskedEnvironment } from '@roles/shared';

import { useEnvironments } from '../api/environments';

interface SelectedEnvValue {
  environments: MaskedEnvironment[];
  selected: MaskedEnvironment | undefined;
  setSelectedId: (id: string) => void;
  isLoading: boolean;
}

const SelectedEnvContext = createContext<SelectedEnvValue | null>(null);

export function SelectedEnvProvider({ children }: { children: ReactNode }) {
  const { data: environments = [], isLoading } = useEnvironments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = environments.find((e) => e.id === selectedId) ?? environments[0];

  return (
    <SelectedEnvContext.Provider value={{ environments, selected, setSelectedId, isLoading }}>
      {children}
    </SelectedEnvContext.Provider>
  );
}

export function useSelectedEnv(): SelectedEnvValue {
  const value = useContext(SelectedEnvContext);
  if (!value) throw new Error('useSelectedEnv must be used inside SelectedEnvProvider');
  return value;
}
