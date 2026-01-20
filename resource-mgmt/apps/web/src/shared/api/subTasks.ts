import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { SubTask } from '../types/api'

export function useSubTasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => apiClient.get<SubTask[]>(`/subtasks/task/${taskId}`),
    enabled: !!taskId,
  })
}

export function useSubTask(id: string) {
  return useQuery({
    queryKey: ['subtasks', id],
    queryFn: () => apiClient.get<SubTask>(`/subtasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateSubTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { taskId: string; title: string; order?: number }) =>
      apiClient.post<SubTask>('/subtasks', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateSubTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SubTask> & { id: string }) =>
      apiClient.put<SubTask>(`/subtasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteSubTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subtasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
