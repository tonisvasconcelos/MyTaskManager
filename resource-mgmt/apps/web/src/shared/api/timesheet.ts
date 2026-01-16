import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { TimeEntry, TimesheetSummary } from '../types/api'

export function useTimesheet(params?: { userId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['timesheet', params],
    queryFn: () => apiClient.get<TimesheetSummary>('/timesheet', params),
  })
}

export function useTimeEntry(id: string) {
  return useQuery({
    queryKey: ['time-entries', id],
    queryFn: () => apiClient.get<TimeEntry>(`/time-entries/${id}`),
    enabled: !!id,
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'task' | 'user'>) =>
      apiClient.post<TimeEntry>('/time-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet'] })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TimeEntry> & { id: string }) =>
      apiClient.put<TimeEntry>(`/time-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
    },
  })
}
