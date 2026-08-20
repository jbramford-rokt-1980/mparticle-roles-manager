import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Manifest, ManifestDiff, MutationIntent, Role } from '@roles/shared';

import { apiRequest } from './client';

export interface PlanResult {
  proposedRoles: Role[];
  baseVersion: number | string | null;
  diff: ManifestDiff;
  warnings: string[];
}

export function usePlanRoles(envId: string | undefined) {
  return useMutation({
    mutationFn: (intent: MutationIntent) =>
      apiRequest<PlanResult>(`/api/environments/${envId}/roles/plan`, {
        method: 'POST',
        body: JSON.stringify(intent),
      }),
  });
}

export interface CommitPayload {
  proposedRoles: Role[];
  baseVersion: number | string | null;
}

export function useCommitRoles(envId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitPayload) =>
      apiRequest<Manifest>(`/api/environments/${envId}/roles/commit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifest', envId] });
      void queryClient.invalidateQueries({ queryKey: ['history', envId] });
    },
  });
}
