const AUTH_KEY = 'sanrachna_v2_auth'

const DEFAULT_DEV_BACKEND = 'http://localhost:5000'

/** Base URL for the Express API (matches `backendAuth` and backend default port). */
export function getBackendBaseUrl(): string | null {
  const raw = import.meta.env.VITE_BACKEND_URL
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/+$/, '')
  if (import.meta.env.DEV) return DEFAULT_DEV_BACKEND
  return null
}

export function isBackendConfigured(): boolean {
  return getBackendBaseUrl() !== null
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.body = body
  }
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  try {
    const raw = window.localStorage.getItem(AUTH_KEY)
    if (!raw) return headers
    const parsed = JSON.parse(raw) as { token?: string | null }
    const token = typeof parsed?.token === 'string' ? parsed.token : null
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // ignore
  }
  return headers
}

/** REST fetch against `VITE_BACKEND_URL`. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getBackendBaseUrl()
  if (!base) {
    return new Response(JSON.stringify({ error: 'VITE_BACKEND_URL is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init.headers)
  const baseHeaders = authHeaders() as Record<string, string>
  for (const [k, v] of Object.entries(baseHeaders)) {
    if (!headers.has(k)) headers.set(k, v)
  }
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, headers })
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  const text = await res.text()
  if (!res.ok) {
    throw new ApiRequestError(text || res.statusText || 'Request failed', res.status, text)
  }
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiRequestError('Invalid JSON response', res.status, text)
  }
}
