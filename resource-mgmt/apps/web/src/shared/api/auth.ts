import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { User } from '../types/api'

export interface MeResponse {
  user: User
  tenant: {
    id: string
    slug: string
    planName: string
    maxUsers: number
    activeUntil: string | null
    isActive: boolean
  }
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<MeResponse>('/auth/me'),
    retry: false,
  })
}
