import type { ApiError } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const USER_TOKEN_KEY = 'resource-mgmt.userToken'
const ADMIN_TOKEN_KEY = 'resource-mgmt.adminToken'

export function getUserToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY)
}

export function setUserToken(token: string) {
  localStorage.setItem(USER_TOKEN_KEY, token)
}

export function clearUserToken() {
  localStorage.removeItem(USER_TOKEN_KEY)
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!getUserToken()
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken()
}

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
      const text = await response.text()
      if (text) {
        errorData = JSON.parse(text)
      } else {
        // Empty response body
        throw new Error('Empty response')
      }
    } catch (parseError) {
      // If response is not JSON or is empty, create a more helpful error
      const statusText = response.statusText || 'Unknown Error'
      let message = `HTTP ${response.status}: ${statusText}`
      
      if (response.status === 500) {
        message = 'Server error. Please check if the backend service is running and the database is accessible.'
      } else if (response.status === 404) {
        message = 'The requested resource was not found. Please check the API endpoint.'
      } else if (response.status === 401) {
        message = 'Authentication failed. Please check your credentials.'
      } else if (response.status === 403) {
        message = 'Access denied. You do not have permission to perform this action.'
      } else if (response.status === 0 || response.status === 503) {
        message = 'Unable to connect to the server. Please check your network connection and ensure the API is running.'
      }
      
      throw new ApiClientError(
        `HTTP_${response.status}`,
        message,
        { status: response.status, statusText, url: response.url }
      )
    }

    // If we have error data, use it
    if (errorData?.error) {
      throw new ApiClientError(
        errorData.error.code || `HTTP_${response.status}`,
        errorData.error.message || `HTTP ${response.status}: ${response.statusText}`,
        errorData.error.details
      )
    } else {
      // Fallback if error structure is unexpected
      throw new ApiClientError(
        `HTTP_${response.status}`,
        `HTTP ${response.status}: ${response.statusText}`,
        errorData
      )
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

function getAuthHeader(path: string): string | undefined {
  // Admin endpoints use admin token
  if (path.startsWith('/admin/')) {
    const token = getAdminToken()
    return token ? `Bearer ${token}` : undefined
  }

  const token = getUserToken()
  return token ? `Bearer ${token}` : undefined
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
        ...(getAuthHeader(path) ? { Authorization: getAuthHeader(path)! } : {}),
      },
    })

    return handleResponse<T>(response)
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthHeader(path) ? { Authorization: getAuthHeader(path)! } : {}),
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
        ...(getAuthHeader(path) ? { Authorization: getAuthHeader(path)! } : {}),
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
        ...(getAuthHeader(path) ? { Authorization: getAuthHeader(path)! } : {}),
      },
    })

    return handleResponse<T>(response)
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        ...(getAuthHeader(path) ? { Authorization: getAuthHeader(path)! } : {}),
      },
      body: formData,
    })

    return handleResponse<T>(response)
  },
}
