import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Task, PaginationResult, PaginationParams } from '../types/api'

export function useTasks(
  params?: PaginationParams & {
    search?: string
    projectId?: string
    status?: string
    assigneeId?: string
    priority?: string
    sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'title'
    sortOrder?: 'asc' | 'desc'
  }
) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => apiClient.get<PaginationResult<Task>>('/tasks', params),
  })
}

export function useOngoingTasks(
  params?: PaginationParams & { assigneeId?: string; includeBlocked?: boolean }
) {
  return useQuery({
    queryKey: ['tasks', 'ongoing', params],
    queryFn: () =>
      apiClient.get<PaginationResult<Task>>('/tasks/ongoing', {
        ...params,
        includeBlocked: params?.includeBlocked ? 'true' : 'false',
      }),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'project' | 'assignee'>) =>
      apiClient.post<Task>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: string }) =>
      apiClient.put<Task>(`/tasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'ongoing'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'ongoing'] })
    },
  })
}
