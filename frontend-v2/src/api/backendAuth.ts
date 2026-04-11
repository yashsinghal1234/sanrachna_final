import type { Role, User } from '@/auth/AuthContext'

import { getBackendBaseUrl } from '@/api/http'

function authApiBaseUrl(): string {
  return getBackendBaseUrl() ?? 'http://localhost:5000'
}

type ApiAuthResponse = {
  token: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: Role | null
  }
}

type ForgotPasswordResponse = {
  userId: string
}

type MessageResponse = {
  message: string
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${authApiBaseUrl()}${path}`
  // #region agent log
  try {
    fetch('http://127.0.0.1:7677/ingest/ba1e38c9-0598-4a94-91be-488827d30486',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d7a374'},body:JSON.stringify({sessionId:'d7a374',runId:'pre-fix',hypothesisId:'B1',location:'src/api/backendAuth.ts:postJson:beforeFetch',message:'auth fetch starting',data:{url,origin:globalThis.location?.origin,path,hasBody:body!=null},timestamp:Date.now()})}).catch(()=>{});
  } catch {}
  // #endregion agent log

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err: unknown) {
    const e = err as any
    // #region agent log
    try {
      fetch('http://127.0.0.1:7677/ingest/ba1e38c9-0598-4a94-91be-488827d30486',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d7a374'},body:JSON.stringify({sessionId:'d7a374',runId:'pre-fix',hypothesisId:'B1',location:'src/api/backendAuth.ts:postJson:fetchCatch',message:'auth fetch threw (likely CORS/network)',data:{url,origin:globalThis.location?.origin,name:String(e?.name??''),message:String(e?.message??e),stack:String(e?.stack??'').slice(0,300)},timestamp:Date.now()})}).catch(()=>{});
    } catch {}
    // #endregion agent log
    throw err
  }

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data ? String((data as { message?: unknown }).message) : 'Request failed.'
    throw new Error(message)
  }
  // #region agent log
  try {
    fetch('http://127.0.0.1:7677/ingest/ba1e38c9-0598-4a94-91be-488827d30486',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d7a374'},body:JSON.stringify({sessionId:'d7a374',runId:'pre-fix',hypothesisId:'B1',location:'src/api/backendAuth.ts:postJson:afterFetch',message:'auth fetch completed',data:{url,origin:globalThis.location?.origin,status:res.status,ok:res.ok},timestamp:Date.now()})}).catch(()=>{});
  } catch {}
  // #endregion agent log
  return data as T
}

export async function backendSignup(payload: {
  name: string
  email: string
  password: string
  role: Role
  phone: string
}) {
  const data = await postJson<ApiAuthResponse>('/api/auth/signup', payload)
  const user: User = {
    id: data.user.id,
    name: data.user.name,
    emailOrPhone: data.user.email,
    phone: typeof data.user.phone === 'string' ? data.user.phone : undefined,
    role: data.user.role ?? null,
  }
  return { token: data.token, user }
}

export async function backendSignin(payload: { email: string; password: string }) {
  const data = await postJson<ApiAuthResponse>('/api/auth/signin', payload)
  const user: User = {
    id: data.user.id,
    name: data.user.name,
    emailOrPhone: data.user.email,
    phone: typeof data.user.phone === 'string' ? data.user.phone : undefined,
    role: data.user.role ?? null,
  }
  return { token: data.token, user }
}

export function backendForgotPassword(payload: { username: string; email: string }) {
  return postJson<ForgotPasswordResponse>('/api/auth/forgot-password', payload)
}

export function backendResetPassword(payload: { userId: string | null; newPassword: string }) {
  return postJson<MessageResponse>('/api/auth/reset-password', payload)
}

