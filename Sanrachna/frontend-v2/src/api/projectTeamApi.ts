import { ApiRequestError, apiJson } from '@/api/http'
import type { Role } from '@/auth/AuthContext'

export type ProjectListItem = { id: string; name: string; location: string; updatedAt?: string }

export type ProjectDetailDto = ProjectListItem & {
  startDate?: string
  deadline?: string
  status?: string
  scheduleNotes?: string
  /** Mongo planning blob; AI studio uses `planning.sanrachnaStudio`. */
  planning?: Record<string, unknown>
  createdAt?: string
}

export type UserSearchDto = { id: string; name: string; email?: string; role: Role }

export function messageFromApiError(e: unknown): string {
  if (e instanceof ApiRequestError) {
    try {
      const o = JSON.parse(e.body) as { message?: string }
      if (o?.message && typeof o.message === 'string') return o.message
    } catch {
      // ignore
    }
    return e.message || 'Request failed'
  }
  if (e instanceof Error) return e.message
  return 'Request failed'
}

export async function apiListProjects(): Promise<{ projects: ProjectListItem[] }> {
  return apiJson<{ projects: ProjectListItem[] }>('/api/projects')
}

export async function apiGetProject(projectId: string): Promise<{ project: ProjectDetailDto }> {
  return apiJson<{ project: ProjectDetailDto }>(`/api/projects/${encodeURIComponent(projectId)}`)
}

export async function apiPatchProject(
  projectId: string,
  body: Partial<{
    name: string
    location: string
    startDate: string
    deadline: string
    status: string
    scheduleNotes: string
  }>,
): Promise<{ project: ProjectDetailDto }> {
  return apiJson<{ project: ProjectDetailDto }>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** Outer backend: project name/location/schedule fields. */
export async function apiPatchProjectSettings(
  projectId: string,
  body: Partial<{
    name: string
    location: string
    startDate: string
    deadline: string
    status: string
    scheduleNotes: string
  }>,
): Promise<{ project: ProjectDetailDto }> {
  return apiJson<{ project: ProjectDetailDto }>(
    `/api/projects/${encodeURIComponent(projectId)}/settings/project`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

/** Saves AI Planning Studio state under Mongo `planning.sanrachnaStudio` (outer backend). */
export async function apiPatchPlanningStudio(
  projectId: string,
  studio: Record<string, unknown>,
): Promise<{ message?: string }> {
  return apiJson<{ message?: string }>(`/api/projects/${encodeURIComponent(projectId)}/planning-studio`, {
    method: 'PATCH',
    body: JSON.stringify({ studio }),
  })
}

export async function apiPatchPlanningInsights(
  projectId: string,
  insights: Record<string, unknown>,
): Promise<{ planning?: Record<string, unknown> }> {
  return apiJson<{ planning?: Record<string, unknown> }>(
    `/api/projects/${encodeURIComponent(projectId)}/planning-insights`,
    {
      method: 'PATCH',
      body: JSON.stringify({ insights }),
    },
  )
}

export async function apiPatchPlanningTimeline(
  projectId: string,
  timeline: Record<string, unknown>,
): Promise<{ message?: string; planning?: Record<string, unknown> }> {
  return apiJson<{ message?: string; planning?: Record<string, unknown> }>(
    `/api/projects/${encodeURIComponent(projectId)}/planning-timeline`,
    {
      method: 'PATCH',
      body: JSON.stringify({ timeline }),
    },
  )
}

export async function apiCreateProject(body: {
  name: string
  location: string
}): Promise<{ project: ProjectListItem & Record<string, unknown> }> {
  return apiJson<{ project: ProjectListItem & Record<string, unknown> }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiSearchUsers(params: {
  q: string
  role?: Role
}): Promise<{ users: UserSearchDto[] }> {
  const qs = new URLSearchParams()
  qs.set('q', params.q)
  if (params.role) qs.set('role', params.role)
  return apiJson<{ users: UserSearchDto[] }>(`/api/users/search?${qs.toString()}`)
}

export async function apiGetTeam(projectId: string): Promise<{ members: unknown[] }> {
  return apiJson<{ members: unknown[] }>(`/api/projects/${encodeURIComponent(projectId)}/settings/team`)
}

export async function apiAddTeamMember(
  projectId: string,
  body: { username: string },
): Promise<{ member: unknown }> {
  return apiJson<{ member: unknown }>(`/api/projects/${encodeURIComponent(projectId)}/settings/team`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiRemoveTeamMember(
  projectId: string,
  memberId: string,
): Promise<{ message: string }> {
  return apiJson<{ message: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/settings/team/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
  )
}

export async function apiUpdateTeamMemberRole(
  projectId: string,
  memberId: string,
  body: { role: 'engineer' | 'worker' },
): Promise<{ member: { id: string; name: string; role: Role; status: string } }> {
  return apiJson<{ member: { id: string; name: string; role: Role; status: string } }>(
    `/api/projects/${encodeURIComponent(projectId)}/settings/team/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}
