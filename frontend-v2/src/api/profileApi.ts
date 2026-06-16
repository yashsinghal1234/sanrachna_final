import { apiJson } from './http'
import type { User } from '@/auth/AuthContext'

export async function apiGetProfile() {
  return apiJson<{ user: User & Record<string, any> }>('/api/users/me', { method: 'GET' })
}

export async function apiUpdateProfile(payload: Partial<User> & Record<string, any>) {
  return apiJson<{ user: User & Record<string, any> }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
