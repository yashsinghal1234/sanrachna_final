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
  const payload = await apiJson<unknown>(`${WS(projectId)}/issues`)
  return unwrapList(payload) as IssueItem[]
}

export async function fetchWorkspaceRfis(projectId: string): Promise<RfiItem[]> {
  const payload = await apiJson<unknown>(`${WS(projectId)}/rfis`)
  return unwrapList(payload) as RfiItem[]
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
      summary: (o.summary as ProjectSummary) ?? (o.projectSummary as ProjectSummary) ?? null,
      cost_breakdown: (o.cost_breakdown as CostBreakdown) ?? null,
      resources: unwrapList(o.resources) as ResourceLine[],
      timeline_tasks: unwrapList(o.timeline_tasks) as TimelineTask[],
      activity: unwrapList(o.activity) as ActivityItem[],
    }
  }
  return { summary: null, cost_breakdown: null, resources: [], timeline_tasks: [], activity: [] }
}

export async function fetchWorkerTasks(projectId: string, workerKey: string): Promise<unknown[]> {
  const q = new URLSearchParams({ worker: workerKey })
  const payload = await apiJson<unknown>(`${WS(projectId)}/worker-tasks?${q.toString()}`)
  return unwrapList(payload)
}
