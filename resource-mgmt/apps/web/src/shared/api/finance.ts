import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { ProjectFinancialEntriesResponse } from '../types/api'

export function useProjectFinancialEntries(projectId?: string) {
  return useQuery({
    queryKey: ['finance', 'project-entries', projectId],
    queryFn: () =>
      apiClient.get<ProjectFinancialEntriesResponse>('/finance/project-entries', {
        ...(projectId && { projectId }),
      }),
  })
}
