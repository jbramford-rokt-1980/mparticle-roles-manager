import { useQuery } from '@tanstack/react-query';

import type { Manifest, TaskDef } from '@roles/shared';

import { apiRequest } from './client';

export function useManifest(envId: string | undefined) {
  return useQuery({
    queryKey: ['manifest', envId],
    enabled: Boolean(envId),
    queryFn: () => apiRequest<Manifest>(`/api/environments/${envId}/manifest`),
  });
}

export function useTasks(envId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', envId],
    enabled: Boolean(envId),
    // The catalog rarely changes; the proxy also caches it for 10 minutes.
    staleTime: 10 * 60 * 1000,
    queryFn: () => apiRequest<TaskDef[]>(`/api/environments/${envId}/tasks`),
  });
}
