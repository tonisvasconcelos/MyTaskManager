import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { TaskAttachment } from '../types/api'

export function useTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId, 'attachments'],
    queryFn: () => apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  })
}

export function useUploadAttachments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, files }: { taskId: string; files: File[] }) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      return apiClient.upload<TaskAttachment[]>(`/tasks/${taskId}/attachments`, formData)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId, 'attachments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { attachmentId: string; taskId: string }) =>
      apiClient.delete(`/attachments/${vars.attachmentId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId, 'attachments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}
