import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Expense, PaginationResult, PaginationParams } from '../types/api'

export function useProcurements(
  params?: PaginationParams & { search?: string; projectId?: string }
): ReturnType<typeof useQuery<Expense[] | PaginationResult<Expense>>> {
  // If projectId is provided, use the project expenses endpoint
  if (params?.projectId) {
    return useQuery({
      queryKey: ['procurements', 'project', params.projectId],
      queryFn: () => apiClient.get<Expense[]>(`/projects/${params.projectId}/expenses`),
    }) as any
  }

  return useQuery({
    queryKey: ['procurements', params],
    queryFn: () => apiClient.get<PaginationResult<Expense>>('/procurements', params),
  }) as any
}

export function useProcurement(id: string) {
  return useQuery({
    queryKey: ['procurements', id],
    queryFn: () => apiClient.get<Expense>(`/procurements/${id}`),
    enabled: !!id,
  })
}

export function useCreateProcurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'company' | 'allocations'> & {
      allocations: Array<{ projectId: string; allocatedAmount: number | string }>
    }) => apiClient.post<Expense>('/procurements', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] })
      // Invalidate project expenses for all allocated projects
      if (variables.allocations) {
        variables.allocations.forEach((alloc) => {
          queryClient.invalidateQueries({ queryKey: ['procurements', 'project', alloc.projectId] })
        })
      }
    },
  })
}

export function useUpdateProcurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Expense> & {
      id: string
      allocations?: Array<{ projectId: string; allocatedAmount: number | string }>
    }) => apiClient.put<Expense>(`/procurements/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] })
      queryClient.invalidateQueries({ queryKey: ['procurements', variables.id] })
      // Also invalidate project expenses if projectId is in allocations
      if (variables.allocations) {
        variables.allocations.forEach((alloc) => {
          queryClient.invalidateQueries({ queryKey: ['procurements', 'project', alloc.projectId] })
        })
      }
    },
  })
}

export function useDeleteProcurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/procurements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] })
      // Also invalidate all project expenses queries
      queryClient.invalidateQueries({ queryKey: ['procurements', 'project'] })
    },
  })
}
