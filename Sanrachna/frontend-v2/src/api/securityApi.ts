import { apiJson } from '@/api/http'

export async function apiChangePassword(body: {
  currentPassword: string
  newPassword: string
}): Promise<{ message: string }> {
  return apiJson<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
