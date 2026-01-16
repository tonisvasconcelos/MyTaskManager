import type { ApiError } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError
    try {
      errorData = await response.json()
    } catch {
      throw new ApiClientError(
        'UNKNOWN_ERROR',
        `HTTP ${response.status}: ${response.statusText}`
      )
    }

    throw new ApiClientError(
      errorData.error.code,
      errorData.error.message,
      errorData.error.details
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const apiClient = {
  async get<T>(path: string, params?: unknown): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`)
    if (params && typeof params === 'object') {
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return handleResponse<T>(response)
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return handleResponse<T>(response)
  },

  async put<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return handleResponse<T>(response)
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return handleResponse<T>(response)
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    })

    return handleResponse<T>(response)
  },
}
