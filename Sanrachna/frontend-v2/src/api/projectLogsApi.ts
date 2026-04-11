import { ApiRequestError, apiFetch, apiJson, getBackendBaseUrl } from '@/api/http'

export type ProjectLogDto = {
  id: string
  date: string
  tasks_completed: string
  workers_present: number
  issues: string
  photo_url: string | null
  author: string
  status?: 'pending' | 'approved' | 'rejected' | string
  submittedBy?: string | null
  submittedByName?: string | null
  photoCapturedAt?: string | null
  photoUploadedAt?: string | null
  createdAt?: string
}

export function logPhotoAbsoluteUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl
  const base = getBackendBaseUrl()?.replace(/\/+$/, '') ?? ''
  const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
  /** Relative `/uploads/...` only works if the SPA is served from the API host; prefer absolute API origin when configured. */
  if (base) return `${base}${path}`
  return path
}

export async function apiListProjectLogs(projectId: string): Promise<{ logs: ProjectLogDto[] }> {
  return apiJson<{ logs: ProjectLogDto[] }>(`/api/projects/${encodeURIComponent(projectId)}/logs`)
}

export async function apiCreateProjectLogPhoto(
  projectId: string,
  formData: FormData,
): Promise<{ log: ProjectLogDto }> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/logs`, {
    method: 'POST',
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new ApiRequestError(text || res.statusText || 'Upload failed', res.status, text)
  }
  if (!text) return { log: {} as ProjectLogDto }
  return JSON.parse(text) as { log: ProjectLogDto }
}

export async function apiPatchProjectLogStatus(
  projectId: string,
  logId: string,
  body: { status: 'approved' | 'rejected'; workersPresent?: number },
): Promise<{ log: ProjectLogDto }> {
  return apiJson<{ log: ProjectLogDto }>(
    `/api/projects/${encodeURIComponent(projectId)}/logs/${encodeURIComponent(logId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}
