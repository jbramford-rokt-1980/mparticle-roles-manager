import { useQuery } from '@tanstack/react-query';

import { apiRequest } from './client';

export interface HistoryListEntry {
  id: string;
  timestamp: string;
  action: 'baseline' | 'commit';
  summary: string;
  versionBefore: number | string | null;
  versionAfter: number | string | null;
  roleCountBefore: number;
  roleCountAfter: number;
}

export function useHistory(envId: string | undefined) {
  return useQuery({
    queryKey: ['history', envId],
    enabled: Boolean(envId),
    queryFn: () => apiRequest<HistoryListEntry[]>(`/api/environments/${envId}/history`),
  });
}
