import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Payment, PaginationResult, PaginationParams } from '../types/api'

export function usePayments(
  params?: PaginationParams & { search?: string; expenseId?: string }
): ReturnType<typeof useQuery<PaginationResult<Payment>>> {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => apiClient.get<PaginationResult<Payment>>('/payments', params),
  }) as any
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => apiClient.get<Payment>(`/payments/${id}`),
    enabled: !!id,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'expense'>) =>
      apiClient.post<Payment>('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Payment> & { id: string }) =>
      apiClient.put<Payment>(`/payments/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}
