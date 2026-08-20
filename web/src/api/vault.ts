import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VaultStatus } from '@roles/shared';

import { apiRequest } from './client';

const STATUS_KEY = ['vault', 'status'] as const;

export function useVaultStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => apiRequest<{ status: VaultStatus }>('/api/vault/status'),
  });
}

function usePassphraseMutation(path: '/api/vault/init' | '/api/vault/unlock') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passphrase: string) =>
      apiRequest<{ status: VaultStatus }>(path, {
        method: 'POST',
        body: JSON.stringify({ passphrase }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

export function useInitVault() {
  return usePassphraseMutation('/api/vault/init');
}

export function useUnlockVault() {
  return usePassphraseMutation('/api/vault/unlock');
}

export function useLockVault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ status: VaultStatus }>('/api/vault/lock', { method: 'POST', body: '{}' }),
    onSuccess: (result) => {
      // Flip the UI to locked straight away, then drop every cached response
      // that came from the customer's org. Clearing the whole cache instead
      // would remove the status query itself and leave the app on the last
      // screen until something happened to refetch it.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'vault',
      });
      queryClient.setQueryData(STATUS_KEY, result);
    },
  });
}
