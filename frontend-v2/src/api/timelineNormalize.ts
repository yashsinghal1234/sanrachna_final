import type { GanttTask, ProjectTimeline, RecoveryAction, ResourceWeek, RiskItem } from '@/types/timeline.types'

function toDate(v: unknown, fallback: Date): Date {
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? fallback : d
  }
  return fallback
}

export function normalizeProjectTimeline(raw: unknown, fallbackId: string, fallbackName: string): ProjectTimeline | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const now = new Date()
  const projectId = typeof o.projectId === 'string' ? o.projectId : fallbackId
  const projectName = typeof o.projectName === 'string' ? o.projectName : fallbackName
  const tasksRaw = Array.isArray(o.tasks) ? o.tasks : []

  const tasks: GanttTask[] = tasksRaw.map((t) => {
    const tr = t as Record<string, unknown>
    const startDate = toDate(tr.startDate, now)
    const endDate = toDate(tr.endDate, startDate)
    return {
      id: String(tr.id ?? ''),
      backendTaskId: typeof tr.backendTaskId === 'string' && tr.backendTaskId ? tr.backendTaskId : undefined,
      name: String(tr.name ?? 'Task'),
      phase: tr.phase as GanttTask['phase'],
      startDate,
      endDate,
      durationDays: typeof tr.durationDays === 'number' ? tr.durationDays : 0,
      dependsOn: Array.isArray(tr.dependsOn) ? tr.dependsOn.map(String) : [],
      assignedCrew: String(tr.assignedCrew ?? ''),
      status: (tr.status as GanttTask['status']) ?? 'not-started',
      percentComplete: typeof tr.percentComplete === 'number' ? tr.percentComplete : 0,
      isCriticalPath: Boolean(tr.isCriticalPath),
      isMilestone: Boolean(tr.isMilestone),
      baselineStart: toDate(tr.baselineStart, startDate),
      baselineEnd: toDate(tr.baselineEnd, endDate),
      delayDays: typeof tr.delayDays === 'number' ? tr.delayDays : 0,
    }
  })

  const resourceTimeline: ResourceWeek[] = Array.isArray(o.resourceTimeline)
    ? (o.resourceTimeline as ResourceWeek[]).map((w) => ({ ...w }))
    : []

  const risks: RiskItem[] = Array.isArray(o.risks) ? (o.risks as RiskItem[]).map((r) => ({ ...r })) : []

  const recoveryActions: RecoveryAction[] = Array.isArray(o.recoveryActions)
    ? (o.recoveryActions as RecoveryAction[]).map((a) => ({ ...a }))
    : []

  const sCurveData = Array.isArray(o.sCurveData)
    ? (o.sCurveData as ProjectTimeline['sCurveData']).map((p) => ({ ...p }))
    : []

  return {
    projectId,
    projectName,
    version: String(o.version ?? 'V1'),
    lastSynced: toDate(o.lastSynced, now),
    status: (o.status as ProjectTimeline['status']) ?? 'On Track',
    plannedCompletionDate: toDate(o.plannedCompletionDate, now),
    forecastedCompletionDate: toDate(o.forecastedCompletionDate, now),
    delayDays: typeof o.delayDays === 'number' ? o.delayDays : 0,
    criticalTaskCount: typeof o.criticalTaskCount === 'number' ? o.criticalTaskCount : 0,
    milestonesRemaining: typeof o.milestonesRemaining === 'number' ? o.milestonesRemaining : 0,
    scheduleHealthScore: typeof o.scheduleHealthScore === 'number' ? o.scheduleHealthScore : 0,
    tasks,
    resourceTimeline,
    risks,
    recoveryActions,
    sCurveData,
  }
}
