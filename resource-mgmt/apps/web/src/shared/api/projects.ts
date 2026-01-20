import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Project, PaginationResult, PaginationParams, User } from '../types/api'

export function useProjects(
  params?: PaginationParams & { search?: string; companyId?: string; status?: string }
) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => apiClient.get<PaginationResult<Project>>('/projects', params),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiClient.get<Project>(`/projects/${id}`),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'company'>) =>
      apiClient.post<Project>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      apiClient.put<Project>(`/projects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectUsers(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'users'],
    queryFn: () => apiClient.get<User[]>(`/projects/${projectId}/users`),
    enabled: !!projectId,
  })
}

export function useUpdateProjectUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userIds }: { projectId: string; userIds: string[] }) =>
      apiClient.put<User[]>(`/projects/${projectId}/users`, { userIds }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'users'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
