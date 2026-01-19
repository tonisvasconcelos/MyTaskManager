import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Sale, PaginationResult, PaginationParams } from '../types/api'

export function useSales(
  params?: PaginationParams & { search?: string }
): ReturnType<typeof useQuery<PaginationResult<Sale>>> {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => apiClient.get<PaginationResult<Sale>>('/sales', params),
  }) as any
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => apiClient.get<Sale>(`/sales/${id}`),
    enabled: !!id,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'company'>) =>
      apiClient.post<Sale>('/sales', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Sale> & { id: string }) =>
      apiClient.put<Sale>(`/sales/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

export function useDeleteSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}
