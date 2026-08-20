import { QueryCache, QueryClient } from '@tanstack/react-query';

import { isApiClientError } from './client';

/**
 * Shared QueryClient factory. When any request fails with VAULT_LOCKED
 * (e.g. the proxy idle-locked), the vault status is re-checked, which
 * routes the app back to the unlock screen.
 */
export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isApiClientError(error, 'VAULT_LOCKED')) {
          void queryClient.invalidateQueries({ queryKey: ['vault', 'status'] });
        }
      },
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return queryClient;
}
