import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Company, PaginationResult, PaginationParams } from '../types/api'

export type CompanyUpsertInput = {
  name: string
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  notes?: string | null
  countryCode?: string | null
  invoicingCurrencyCode?: string | null
  taxRegistrationNo?: string | null
  billingUnit?: 'HR' | 'PROJECT' | null
  unitPrice?: number | null
  generalNotes?: string | null
}

export function useCompanies(params?: PaginationParams & { search?: string }) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => apiClient.get<PaginationResult<Company>>('/companies', params),
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => apiClient.get<Company>(`/companies/${id}`),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CompanyUpsertInput) => apiClient.post<Company>('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CompanyUpsertInput> & { id: string }) =>
      apiClient.put<Company>(`/companies/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['companies', variables.id] })
    },
  })
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return apiClient.upload<Company>(`/companies/${id}/logo`, form)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['companies', variables.id] })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
