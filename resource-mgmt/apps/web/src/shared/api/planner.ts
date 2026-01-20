import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { WorkBlock, PlannerLookups } from '../types/api'

export interface PlannerBlocksParams {
  start: string
  end: string
  userId?: string
  projectId?: string
  taskId?: string
  status?: string
}

export function usePlannerBlocks(params: PlannerBlocksParams) {
  return useQuery({
    queryKey: ['planner', 'blocks', params],
    queryFn: () => apiClient.get<WorkBlock[]>('/planner/blocks', params),
  })
}

export function useCreatePlannerBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<WorkBlock, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'project' | 'task' | 'user'>) =>
      apiClient.post<WorkBlock>('/planner/blocks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'blocks'] })
    },
  })
}

export function useUpdatePlannerBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkBlock> & { id: string }) =>
      apiClient.put<WorkBlock>(`/planner/blocks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'blocks'] })
      queryClient.invalidateQueries({ queryKey: ['planner', 'blocks', variables.id] })
    },
  })
}

export function useDeletePlannerBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/planner/blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'blocks'] })
    },
  })
}

export function usePlannerLookups(projectId?: string) {
  return useQuery({
    queryKey: ['planner', 'lookups', projectId],
    queryFn: () => apiClient.get<PlannerLookups>('/planner/lookups', projectId ? { projectId } : undefined),
  })
}
