import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { TimeEntry, TimesheetSummary } from '../types/api'

export type TimeEntryInput = {
  taskId: string
  userId: string
  entryDate: string // YYYY-MM-DD
  hours: number
  notes?: string
}

export type TimeEntryUpdateInput = Partial<TimeEntryInput> & { id: string }

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
    mutationFn: (data: TimeEntryInput) => apiClient.post<TimeEntry>('/time-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet'] })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: TimeEntryUpdateInput) =>
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
