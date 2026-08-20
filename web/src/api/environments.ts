import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EnvironmentInput, MaskedEnvironment } from '@roles/shared';

import { apiRequest } from './client';

const ENVIRONMENTS_KEY = ['environments'] as const;

export function useEnvironments() {
  return useQuery({
    queryKey: ENVIRONMENTS_KEY,
    queryFn: () => apiRequest<MaskedEnvironment[]>('/api/environments'),
  });
}

function useInvalidateEnvironments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ENVIRONMENTS_KEY });
}

export function useCreateEnvironment() {
  const invalidate = useInvalidateEnvironments();
  return useMutation({
    mutationFn: (input: EnvironmentInput) =>
      apiRequest<MaskedEnvironment>('/api/environments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateEnvironment(id: string) {
  const invalidate = useInvalidateEnvironments();
  return useMutation({
    mutationFn: (input: EnvironmentInput) =>
      apiRequest<MaskedEnvironment>(`/api/environments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteEnvironment() {
  const invalidate = useInvalidateEnvironments();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ ok: boolean }>(`/api/environments/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export interface TestConnectionResult {
  ok: boolean;
  taskCount: number;
}

export function useTestConnection(id: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<TestConnectionResult>(`/api/environments/${id}/test`, {
        method: 'POST',
        body: '{}',
      }),
  });
}
