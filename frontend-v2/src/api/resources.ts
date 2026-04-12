import { apiJson } from '@/api/http'
import { unwrapList } from '@/api/normalize'
import { normalizeProjectTimeline } from '@/api/timelineNormalize'
import { mergeWorkspace } from '@/lib/workspaceFactory'
import type { ProjectWorkspace } from '@/types/projectWorkspace.types'
import type { ProjectTimeline } from '@/types/timeline.types'
import type { IssueItem } from '@/types/issue.types'
import type { RfiItem } from '@/types/rfi.types'
import type { NotificationAlert } from '@/types/notifications.types'
import type { ProjectDocument } from '@/types/documents.types'
import type { Authority, Contact, ContactsStats, Supplier } from '@/types/contacts.types'
import type { DailyLogEntry } from '@/types/dashboard.types'
import type { ProjectSummary, CostBreakdown, ResourceLine, TimelineTask, ActivityItem } from '@/types/dashboard.types'

const WS = (id: string) => `/api/v1/workspaces/${encodeURIComponent(id)}`

export async function fetchWorkspaceList(): Promise<ProjectWorkspace[]> {
  const payload = await apiJson<unknown>('/api/v1/workspaces')
  return unwrapList(payload)
    .map((raw) => mergeWorkspace(raw))
    .filter((x): x is ProjectWorkspace => Boolean(x))
}

export async function createWorkspace(name: string): Promise<ProjectWorkspace> {
  const created = await apiJson<unknown>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify({ name }) })
  const merged = mergeWorkspace(created)
  if (!merged) throw new Error('Invalid workspace response')
  return merged
}

export async function fetchWorkspaceTimeline(projectId: string, projectName: string): Promise<ProjectTimeline | null> {
  try {
    const payload = await apiJson<unknown>(`${WS(projectId)}/timeline`)
    return normalizeProjectTimeline(payload, projectId, projectName)
  } catch {
    return null
  }
}

export async function fetchWorkspaceIssues(projectId: string): Promise<IssueItem[]> {
  const res = await apiJson<unknown>(`/api/projects/${encodeURIComponent(projectId)}/issues`)
  const list = Array.isArray(res) ? res : (res as any)?.issues ?? []
  return list as IssueItem[]
}

export async function createWorkspaceIssue(
  projectId: string,
  body: Record<string, unknown>,
): Promise<IssueItem> {
  const res = await apiJson<{ issue: IssueItem }>(
    `/api/projects/${encodeURIComponent(projectId)}/issues`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.issue
}

export async function updateWorkspaceIssue(
  projectId: string,
  issueId: string,
  body: Record<string, unknown>,
): Promise<IssueItem> {
  const res = await apiJson<{ issue: IssueItem }>(
    `/api/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(issueId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.issue
}

export async function fetchWorkspaceEmergency(projectId: string): Promise<unknown[]> {
  const res = await apiJson<unknown>(`/api/projects/${encodeURIComponent(projectId)}/emergency`)
  return Array.isArray(res) ? res : (res as any)?.incidents ?? []
}

export async function createWorkspaceEmergency(
  projectId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiJson<{ incident: unknown }>(
    `/api/projects/${encodeURIComponent(projectId)}/emergency`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.incident
}

export async function updateWorkspaceEmergency(
  projectId: string,
  incidentId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiJson<{ incident: unknown }>(
    `/api/projects/${encodeURIComponent(projectId)}/emergency/${encodeURIComponent(incidentId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.incident
}

export async function fetchWorkspaceRfis(projectId: string): Promise<RfiItem[]> {
  const res = await apiJson<unknown>(`/api/projects/${encodeURIComponent(projectId)}/rfis`)
  const list = Array.isArray(res) ? res : (res as any)?.rfis ?? []
  return list as RfiItem[]
}

export async function createWorkspaceRfi(
  projectId: string,
  body: Record<string, unknown>,
): Promise<RfiItem> {
  const res = await apiJson<{ rfi: RfiItem }>(
    `/api/projects/${encodeURIComponent(projectId)}/rfis`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.rfi
}

export async function updateWorkspaceRfi(
  projectId: string,
  rfiId: string,
  body: Record<string, unknown>,
): Promise<RfiItem> {
  const res = await apiJson<{ rfi: RfiItem }>(
    `/api/projects/${encodeURIComponent(projectId)}/rfis/${encodeURIComponent(rfiId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.rfi
}

export async function fetchNotifications(): Promise<NotificationAlert[]> {
  const payload = await apiJson<unknown>('/api/v1/notifications')
  return unwrapList(payload) as NotificationAlert[]
}

export async function fetchWorkspaceDocuments(projectId: string): Promise<{
  documents: ProjectDocument[]
  stats?: Record<string, number>
  events?: { id: string; label: string; time: string }[]
  complianceAlerts?: { id: string; severity: 'critical' | 'warning' | 'info'; text: string }[]
}> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/documents`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    return {
      documents: unwrapList(o.documents ?? o.items) as ProjectDocument[],
      stats: (o.stats as Record<string, number>) ?? undefined,
      events: (o.recentEvents as { id: string; label: string; time: string }[]) ?? undefined,
      complianceAlerts: (o.complianceAlerts as { id: string; severity: 'critical' | 'warning' | 'info'; text: string }[]) ?? undefined,
    }
  }
  return { documents: unwrapList(payload) as ProjectDocument[] }
}

export async function fetchWorkspaceContacts(projectId: string): Promise<{
  contacts: Contact[]
  suppliers: Supplier[]
  authorities: Authority[]
  stats?: ContactsStats
}> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/contacts`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    return {
      contacts: unwrapList(o.contacts) as Contact[],
      suppliers: unwrapList(o.suppliers) as Supplier[],
      authorities: unwrapList(o.authorities) as Authority[],
      stats: (o.stats as ContactsStats) ?? undefined,
    }
  }
  return { contacts: unwrapList(payload) as Contact[], suppliers: [], authorities: [] }
}

export async function fetchWorkspaceProcurement(projectId: string): Promise<{
  quotes: unknown[]
  schedule: unknown[]
  recommendations: unknown[]
  alerts: unknown[]
}> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/procurement`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    return {
      quotes: unwrapList(o.quotes ?? o.supplierQuotes),
      schedule: unwrapList(o.schedule ?? o.procurementSchedule),
      recommendations: unwrapList(o.recommendations ?? o.procurementRecommendations),
      alerts: unwrapList(o.alerts ?? o.procurementAlerts),
    }
  }
  return { quotes: [], schedule: [], recommendations: [], alerts: [] }
}

export async function fetchWorkspaceCostResources(projectId: string): Promise<{
  summary: ProjectSummary | null
  cost_breakdown: CostBreakdown | null
  resources: ResourceLine[]
}> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/cost-resources`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    return {
      summary: (o.summary as ProjectSummary) ?? (o.projectSummary as ProjectSummary) ?? null,
      cost_breakdown: (o.cost_breakdown as CostBreakdown) ?? (o.costBreakdown as CostBreakdown) ?? null,
      resources: unwrapList(o.resources) as ResourceLine[],
    }
  }
  return { summary: null, cost_breakdown: null, resources: [] }
}

export async function fetchWorkspaceDailyLogs(projectId: string): Promise<DailyLogEntry[]> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/daily-logs`)
  return unwrapList(payload) as DailyLogEntry[]
}

export async function fetchWorkspaceInsights(projectId: string): Promise<unknown> {
  return apiJson<unknown>(`${WS(projectId)}/insights`)
}

export async function fetchDashboardBundle(projectId: string): Promise<{
  summary: ProjectSummary | null
  cost_breakdown: CostBreakdown | null
  resources: ResourceLine[]
  timeline_tasks: TimelineTask[]
  activity: ActivityItem[]
}> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/dashboard`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    return {
      summary: (o.summary as ProjectSummary) ?? (o.projectSummary as ProjectSummary) ?? (o.project as ProjectSummary) ?? null,
      cost_breakdown: (o.cost_breakdown as CostBreakdown) ?? null,
      resources: unwrapList(o.resources) as ResourceLine[],
      timeline_tasks: unwrapList(o.timeline_tasks) as TimelineTask[],
      activity: unwrapList(o.activity ?? o.recent_activity) as ActivityItem[],
    }
  }
  return { summary: null, cost_breakdown: null, resources: [], timeline_tasks: [], activity: [] }
}

export async function fetchWorkerTasks(projectId: string, workerKey?: string): Promise<unknown[]> {
  const q = new URLSearchParams()
  if (workerKey) q.set('worker', workerKey)
  const url = `/api/projects/${encodeURIComponent(projectId)}/tasks${q.toString() ? `?${q.toString()}` : ''}`
  const res = await apiJson<unknown>(url)
  const list = Array.isArray(res) ? res : (res as any)?.tasks ?? []
  return list
}

export async function createWorkerTask(
  projectId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiJson<{ task: unknown }>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return (res as any)?.task ?? res
}

export async function updateWorkerTask(
  projectId: string,
  taskId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await apiJson<{ task: unknown }>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return (res as any)?.task ?? res
}

export async function deleteWorkerTask(
  projectId: string,
  taskId: string,
): Promise<void> {
  await apiJson<{ success: boolean }>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'DELETE' },
  )
}

export type EstimateResult = {
  prediction: number
  model: string
  features: {
    Material_Cost: number
    Labor_Cost: number
    Profit_Rate: number
    Markup_cost: number
    Discount_cost: number
  }
  inputTotal: number
  variance: number
  variancePct: number
}

export async function apiEstimateBudget(
  projectId: string,
  features: {
    material: number
    labor: number
    profit_rate: number
    markup: number
    discount: number
  },
): Promise<EstimateResult> {
  return apiJson<EstimateResult>(
    `/api/projects/${encodeURIComponent(projectId)}/estimate`,
    { method: 'POST', body: JSON.stringify(features) },
  )
}
