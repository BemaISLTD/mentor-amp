import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/').replace(/\/+$/, '')
const TOKEN_KEY = 'mentor-amp-access-token'

export type ApiUser = {
  id: string
  email: string
  full_name: string
  roles: string[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type ApiContextValue = {
  baseUrl: string
  token: string | null
  user: ApiUser | null
  authState: 'checking' | 'authenticated' | 'unauthenticated' | 'unavailable'
  authError: string | null
  request: <T>(path: string, init?: RequestInit) => Promise<T>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const ApiContext = createContext<ApiContextValue | null>(null)

function errorMessage(body: unknown, status: number): { message: string; code?: string } {
  if (status === 403) {
    return { message: 'You do not have permission to perform this action. Contact a project administrator if you need access.' }
  }
  if (body && typeof body === 'object') {
    const payload = body as { detail?: unknown; error?: { message?: unknown; code?: unknown }; code?: unknown; message?: unknown }
    const detail = payload.error ?? payload.detail
    if (detail && typeof detail === 'object') {
      const error = detail as { message?: unknown; code?: unknown; details?: unknown }
      const message = typeof error.message === 'string'
        ? error.message
        : typeof payload.message === 'string'
          ? payload.message
          : JSON.stringify(error.details ?? detail)
      const code = typeof error.code === 'string'
        ? error.code
        : typeof payload.code === 'string'
          ? payload.code
          : undefined
      return { message, code }
    }
    if (typeof detail === 'string') return { message: detail, code: typeof payload.code === 'string' ? payload.code : undefined }
  }
  return { message: `Backend request failed (${status}).` }
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => window.sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<ApiUser | null>(null)
  const [authState, setAuthState] = useState<ApiContextValue['authState']>('checking')
  const [authError, setAuthError] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError(`Could not reach the backend at ${API_BASE_URL}. Check that the API is running and CORS allows this frontend origin.`, 0)
    }
    if (response.status === 204) return undefined as T
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const details = errorMessage(payload, response.status)
      throw new ApiError(details.message, response.status, details.code)
    }
    return payload as T
  }, [token])

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setAuthError(null)
    setAuthState('unauthenticated')
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setAuthState('checking')
    request<ApiUser>('/v1/auth/me', { signal: controller.signal })
      .then(currentUser => {
        setUser(currentUser)
        setAuthError(null)
        setAuthState('authenticated')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          signOut()
          return
        }
        setUser(null)
        setAuthError(error instanceof Error ? error.message : 'Could not check backend authentication.')
        setAuthState('unavailable')
      })
    return () => controller.abort()
  }, [request, signOut])

  const signIn = useCallback(async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    const response = await fetch(`${API_BASE_URL}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) throw new ApiError(errorMessage(result, response.status).message, response.status)
    if (!result || typeof result !== 'object' || !('access_token' in result) || typeof result.access_token !== 'string') {
      throw new ApiError('The backend returned an invalid access-token response.', response.status)
    }
    window.sessionStorage.setItem(TOKEN_KEY, result.access_token)
    setToken(result.access_token)
    setAuthError(null)
  }, [])

  const value = useMemo(() => ({
    baseUrl: API_BASE_URL, token, user, authState, authError, request, signIn, signOut,
  }), [token, user, authState, authError, request, signIn, signOut])

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi() {
  const value = useContext(ApiContext)
  if (!value) throw new Error('useApi must be used inside ApiProvider.')
  return value
}
