import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { fetchWorkerTasks, createWorkerTask, updateWorkerTask, deleteWorkerTask, fetchWorkspaceTimeline } from '@/api/resources'
import { apiGetProject, apiPatchPlanningTimeline } from '@/api/projectTeamApi'
import { normalizeProjectTimeline } from '@/api/timelineNormalize'
import { isBackendConfigured } from '@/api/http'
import { timelineToStoredJson } from '@/lib/timelineSerialize'
import type { GanttTask, Phase, ProjectTimeline, RecoveryAction } from '@/types/timeline.types'

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

// ─── helpers ─────────────────────────────────────────────────────────────────

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function addDays(date: Date, days: number) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(a: Date, b: Date) {
  const one = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const two = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((two - one) / (24 * 60 * 60 * 1000))
}

function recomputeTaskDerived(t: GanttTask): GanttTask {
  const durationDays = Math.max(0, diffDays(t.startDate, t.endDate))
  const delayDays = Math.max(0, diffDays(t.baselineEnd, t.endDate))
  return { ...t, durationDays, delayDays }
}

function deepCloneTimeline(tl: ProjectTimeline): ProjectTimeline {
  return {
    ...tl,
    lastSynced: new Date(tl.lastSynced),
    plannedCompletionDate: new Date(tl.plannedCompletionDate),
    forecastedCompletionDate: new Date(tl.forecastedCompletionDate),
    tasks: tl.tasks.map((t) => ({
      ...t,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      baselineStart: new Date(t.baselineStart),
      baselineEnd: new Date(t.baselineEnd),
    })),
    resourceTimeline: tl.resourceTimeline.map((w) => ({ ...w })),
    risks: tl.risks.map((r) => ({ ...r })),
    recoveryActions: tl.recoveryActions.map((a) => ({ ...a })),
    sCurveData: tl.sCurveData.map((p) => ({ ...p })),
  }
}

/** Recompute summary metrics from the task list and update timeline accordingly. */
function recomputeMetrics(tl: ProjectTimeline): ProjectTimeline {
  const tasks = tl.tasks
  if (tasks.length === 0) {
    return { ...tl, scheduleHealthScore: 100, criticalTaskCount: 0, milestonesRemaining: 0, delayDays: 0, status: 'On Track' }
  }

  const criticalTaskCount = tasks.filter((t) => t.isCriticalPath).length
  const milestonesRemaining = tasks.filter((t) => t.isMilestone && t.status !== 'completed').length
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length
  const delayedCount = tasks.filter((t) => t.delayDays > 0).length
  const total = tasks.length

  // Health score: start at 100, penalise blocked (−40%) and delayed (−30%)
  let score = 100
  score -= Math.round((blockedCount / total) * 40)
  score -= Math.round((delayedCount / total) * 30)
  score = clamp(score, 0, 100)

  // Forecasted completion = latest endDate across all tasks
  const latestEnd = tasks.reduce((m, t) => (t.endDate > m ? t.endDate : m), tl.plannedCompletionDate)
  const forecastedCompletionDate = latestEnd
  const delayDays = Math.max(0, diffDays(tl.plannedCompletionDate, forecastedCompletionDate))

  const status: ProjectTimeline['status'] =
    delayDays > 28 ? 'Delayed'
    : delayDays > 7 ? 'At Risk'
    : score < 50 ? 'Critical'
    : 'On Track'

  return { ...tl, criticalTaskCount, milestonesRemaining, scheduleHealthScore: score, forecastedCompletionDate, delayDays, status }
}

function makeEmptyTimeline(projectId: string, projectName: string): ProjectTimeline {
  const now = new Date()
  const end = addDays(now, 90)
  return {
    projectId,
    projectName: projectName || 'Project',
    version: 'V1',
    status: 'On Track',
    delayDays: 0,
    criticalTaskCount: 0,
    milestonesRemaining: 0,
    scheduleHealthScore: 100,
    plannedCompletionDate: end,
    forecastedCompletionDate: end,
    lastSynced: now,
    tasks: [],
    resourceTimeline: [],
    risks: [],
    recoveryActions: [],
    sCurveData: [],
  }
}

/** Map backend phase string → Gantt Phase (tolerant). */
function normalizePhase(raw: string): GanttTask['phase'] {
  const valid: GanttTask['phase'][] = ['Foundation', 'Substructure', 'Superstructure', 'MEP', 'Finishing', 'Handover']
  if (valid.includes(raw as GanttTask['phase'])) return raw as GanttTask['phase']
  if (raw === 'Structure') return 'Substructure'
  return 'Finishing'
}

/** Map backend status string → Gantt TaskStatus. */
function normalizeGanttStatus(raw: string): GanttTask['status'] {
  if (raw === 'Completed') return 'completed'
  if (raw === 'In progress') return 'in-progress'
  if (raw === 'Blocked') return 'blocked'
  return 'not-started'
}

/** Convert a backend Task DTO into a GanttTask. */
function backendTaskToGantt(t: Record<string, unknown>, now: Date): GanttTask {
  const start = t.startAt ? new Date(t.startAt as string) : now
  const end = t.dueAt ? new Date(t.dueAt as string) : addDays(now, 7)
  const ganttId = (t.ganttTaskId as string) || newId('task')
  return recomputeTaskDerived({
    id: ganttId,
    backendTaskId: t.id as string,
    name: (t.title as string) || 'Task',
    phase: normalizePhase((t.phase as string) || ''),
    startDate: start,
    endDate: end,
    durationDays: 0,
    dependsOn: [],
    assignedCrew: (t.assignedTo as string) || '',
    status: normalizeGanttStatus((t.status as string) || ''),
    percentComplete: typeof t.progressPct === 'number' ? t.progressPct : 0,
    isCriticalPath: (t.priority as string) === 'Critical',
    isMilestone: false,
    baselineStart: start,
    baselineEnd: end,
    delayDays: 0,
  })
}

/** If no timeline is saved in planning.timeline, try to bootstrap from the Tasks collection. */
async function bootstrapTimelineFromTasks(
  projectId: string,
  empty: ProjectTimeline,
): Promise<ProjectTimeline> {
  try {
    const list = await fetchWorkerTasks(projectId)
    if (!Array.isArray(list) || list.length === 0) return empty
    const now = new Date()
    const tasks = (list as Record<string, unknown>[]).map((t) => backendTaskToGantt(t, now))
    const withTasks = { ...empty, tasks }
    return recomputeMetrics(withTasks)
  } catch {
    return empty
  }
}

// ─── backend persistence ──────────────────────────────────────────────────────

function persistTimelineToServer(projectId: string, timeline: ProjectTimeline) {
  if (!isBackendConfigured() || !MONGO_ID_RE.test(projectId)) return
  void apiPatchPlanningTimeline(projectId, { timeline: timelineToStoredJson(timeline) }).catch(() => {})
}

/** Build the body to POST when creating a backend Task from a GanttTask. */
function ganttTaskToBackendPayload(t: GanttTask, _projectId: string): Record<string, unknown> {
  return {
    title: t.name,
    description: '',
    phase: (t.phase === 'Substructure' || t.phase === 'Superstructure' ? 'Structure' : t.phase) as string,
    location: '',
    priority: t.isCriticalPath ? 'Critical' : 'Medium',
    status:
      t.status === 'completed' ? 'Completed'
      : t.status === 'in-progress' ? 'In progress'
      : t.status === 'blocked' ? 'Blocked'
      : 'Not started',
    progressPct: t.percentComplete,
    startAt: t.startDate.toISOString(),
    dueAt: t.endDate.toISOString(),
    assignedTo: t.assignedCrew ?? '',
    assignedBy: 'Engineer',
    ganttTaskId: t.id, // cross-reference stored on backend
  }
}

/**
 * Create a backend Task for the given GanttTask and return the MongoDB _id.
 * Returns null on failure.
 */
async function createBackendTask(projectId: string, task: GanttTask): Promise<string | null> {
  if (!isBackendConfigured() || !MONGO_ID_RE.test(projectId)) return null
  try {
    const res = await createWorkerTask(projectId, ganttTaskToBackendPayload(task, projectId))
    const mongoId = (res as any)?.id ?? (res as any)?._id ?? null
    return mongoId ? String(mongoId) : null
  } catch {
    return null
  }
}

/**
 * Update the backend Task.
 * Uses backendTaskId (MongoDB _id) if present; otherwise falls back to Gantt id
 * (the updated backend controller handles lookup-by-ganttTaskId).
 */
function syncGanttTaskUpdate(projectId: string, ganttTaskId: string, backendTaskId: string | undefined, patch: Partial<GanttTask>) {
  if (!isBackendConfigured() || !MONGO_ID_RE.test(projectId)) return
  const id = backendTaskId || ganttTaskId
  const body: Record<string, unknown> = {}
  if (patch.status !== undefined)
    body.status =
      patch.status === 'completed' ? 'Completed'
      : patch.status === 'in-progress' ? 'In progress'
      : patch.status === 'blocked' ? 'Blocked'
      : 'Not started'
  if (typeof patch.percentComplete === 'number') body.progressPct = patch.percentComplete
  if (patch.assignedCrew !== undefined) body.assignedTo = patch.assignedCrew
  if (patch.name !== undefined) body.title = patch.name
  if (patch.endDate !== undefined) body.dueAt = patch.endDate.toISOString()
  if (patch.startDate !== undefined) body.startAt = patch.startDate.toISOString()
  if (patch.phase !== undefined)
    body.phase = patch.phase === 'Substructure' || patch.phase === 'Superstructure' ? 'Structure' : patch.phase
  if (patch.isCriticalPath !== undefined) body.priority = patch.isCriticalPath ? 'Critical' : 'Medium'
  updateWorkerTask(projectId, id, body).catch(() => {})
}

function syncGanttTaskDelete(projectId: string, ganttTaskId: string, backendTaskId: string | undefined) {
  if (!isBackendConfigured() || !MONGO_ID_RE.test(projectId)) return
  const id = backendTaskId || ganttTaskId
  deleteWorkerTask(projectId, id).catch(() => {})
}

// ─── store types ──────────────────────────────────────────────────────────────

export const PHASE_COLORS: Record<Phase, { bg: string; fg: string; stroke: string }> = {
  Foundation: { bg: '#E8F2FF', fg: '#155EEF', stroke: '#8CB5FF' },
  Substructure: { bg: '#F3E8FF', fg: '#6D28D9', stroke: '#C4B5FD' },
  Superstructure: { bg: '#EAFBF2', fg: '#15803D', stroke: '#86EFAC' },
  MEP: { bg: '#FFF7ED', fg: '#C2410C', stroke: '#FDBA74' },
  Finishing: { bg: '#FFF1F2', fg: '#BE123C', stroke: '#FDA4AF' },
  Handover: { bg: '#F1F5F9', fg: '#0F172A', stroke: '#CBD5E1' },
}

export type ZoomLevel = 'week' | 'month' | 'quarter'

const STORAGE = 'sanrachna_timeline_prefs_v1'

export type TimelineState = {
  timeline: ProjectTimeline | null
  timelineLoadStatus: 'idle' | 'loading' | 'ready' | 'error'
  timelineLoadError: string | null
  timelineProjectId: string | null

  selectedPhaseFilter: Phase | 'All'
  zoomLevel: ZoomLevel
  showDependencies: boolean
  showBaseline: boolean
  showCriticalPath: boolean
  editingTaskId: string | null
  isDirty: boolean

  fetchTimeline: (projectId: string | null, projectName: string) => Promise<void>
  refreshFromBackend: () => Promise<void>

  updateTask: (taskId: string, patch: Partial<GanttTask>) => void
  addTask: (task: Partial<GanttTask>) => void
  deleteTask: (taskId: string) => void

  setPhaseFilter: (phase: Phase | 'All') => void
  setZoomLevel: (level: ZoomLevel) => void
  toggleDependencies: () => void
  toggleBaseline: () => void
  toggleCriticalPath: () => void
  setEditingTaskId: (id: string | null) => void

  markPublished: () => void
  applyRecoveryAction: (actionId: string) => void
  saveChanges: () => void
  setTimeline: (next: ProjectTimeline) => void
}

// ─── store ────────────────────────────────────────────────────────────────────

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      timeline: null,
      timelineLoadStatus: 'idle',
      timelineLoadError: null,
      timelineProjectId: null,
      selectedPhaseFilter: 'All',
      zoomLevel: 'month',
      showDependencies: true,
      showBaseline: true,
      showCriticalPath: true,
      editingTaskId: null,
      isDirty: false,

      // ── fetch ──────────────────────────────────────────────────────────────
      fetchTimeline: async (projectId, projectName) => {
        if (!projectId) {
          set({ timeline: null, timelineLoadStatus: 'ready', timelineLoadError: null, timelineProjectId: null })
          return
        }
        set({ timelineLoadStatus: 'loading', timelineLoadError: null })
        try {
          // 1️⃣ Try loading saved timeline from Mongo planning.timeline
          if (isBackendConfigured() && MONGO_ID_RE.test(projectId)) {
            try {
              const { project } = await apiGetProject(projectId)
              const planning = project.planning && typeof project.planning === 'object' ? project.planning : null
              const raw = planning && 'timeline' in planning ? (planning as { timeline?: unknown }).timeline : undefined
              if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                const name = projectName || project.name || 'Project'
                const tl = normalizeProjectTimeline(raw, projectId, name)
                if (tl && tl.tasks.length > 0) {
                  // Merge any newer backend task data (status/progress updates from workers)
                  const merged = await mergeBackendTaskUpdates(tl, projectId)
                  set({
                    timeline: deepCloneTimeline(recomputeMetrics(merged)),
                    timelineLoadStatus: 'ready',
                    timelineLoadError: null,
                    timelineProjectId: projectId,
                    isDirty: false,
                  })
                  return
                }
              }
            } catch {
              // fall through to bootstrap
            }
          }

          // 2️⃣ No planning.timeline saved yet — try workspace stub (legacy)
          let tl: ProjectTimeline | null = null
          try {
            tl = await fetchWorkspaceTimeline(projectId, projectName)
          } catch {
            // ignore
          }

          // 3️⃣ Bootstrap from backend Tasks collection if timeline is still empty
          const baseTl = tl ?? makeEmptyTimeline(projectId, projectName)
          const resolvedTl =
            baseTl.tasks.length === 0 && isBackendConfigured() && MONGO_ID_RE.test(projectId)
              ? await bootstrapTimelineFromTasks(projectId, baseTl)
              : baseTl

          set({
            timeline: deepCloneTimeline(recomputeMetrics(resolvedTl)),
            timelineLoadStatus: 'ready',
            timelineLoadError: null,
            timelineProjectId: projectId,
            isDirty: false,
          })
        } catch {
          // Even on hard failure, provide an editable empty timeline
          const emptyTl = makeEmptyTimeline(projectId, projectName)
          set({
            timeline: deepCloneTimeline(emptyTl),
            timelineLoadStatus: 'ready',
            timelineLoadError: null,
            timelineProjectId: projectId,
            isDirty: false,
          })
        }
      },

      // ── refresh from backend (pull worker updates into Gantt) ──────────────
      refreshFromBackend: async () => {
        const { timeline, timelineProjectId } = get()
        if (!timeline || !timelineProjectId) return
        if (!isBackendConfigured() || !MONGO_ID_RE.test(timelineProjectId)) return
        try {
          const merged = await mergeBackendTaskUpdates(timeline, timelineProjectId)
          set({ timeline: deepCloneTimeline(recomputeMetrics(merged)), isDirty: false })
        } catch {
          // silent
        }
      },

      // ── task mutations ─────────────────────────────────────────────────────
      updateTask: (taskId, patch) =>
        set((s) => {
          if (!s.timeline) return s
          const tasks = s.timeline.tasks.map((t) =>
            t.id === taskId ? recomputeTaskDerived({ ...t, ...patch } as GanttTask) : t,
          )
          const shouldSyncBackend = Object.keys(patch).some((k) =>
            ['status', 'percentComplete', 'assignedCrew', 'name', 'startDate', 'endDate', 'phase', 'isCriticalPath'].includes(k),
          )
          if (s.timelineProjectId && shouldSyncBackend) {
            const orig = s.timeline.tasks.find((t) => t.id === taskId)
            if (orig) syncGanttTaskUpdate(s.timelineProjectId, taskId, orig.backendTaskId, patch)
          }
          const updated: ProjectTimeline = recomputeMetrics({ ...s.timeline, tasks })
          return { ...s, timeline: updated, isDirty: true }
        }),

      addTask: (task) => {
        // Build the new GanttTask synchronously so UI updates immediately
        const s = get()
        if (!s.timeline) return
        const anchor = s.timeline.tasks[0]?.startDate ?? new Date()
        const startDate = task.startDate ?? anchor
        const endDate = task.endDate ?? addDays(startDate, task.durationDays ?? 7)
        const baseStart = task.baselineStart ?? startDate
        const baseEnd = task.baselineEnd ?? endDate
        const next: GanttTask = recomputeTaskDerived({
          id: task.id ?? newId('task'),
          name: task.name ?? 'New task',
          phase: task.phase ?? 'Finishing',
          startDate,
          endDate,
          durationDays: 0,
          dependsOn: task.dependsOn ?? [],
          assignedCrew: task.assignedCrew ?? 'Crew',
          status: task.status ?? 'not-started',
          percentComplete: clamp(task.percentComplete ?? 0, 0, 100),
          isCriticalPath: Boolean(task.isCriticalPath),
          isMilestone: Boolean(task.isMilestone),
          baselineStart: baseStart,
          baselineEnd: baseEnd,
          delayDays: 0,
          // backendTaskId will be filled after async create
        })

        set((prev) => {
          if (!prev.timeline) return prev
          const tasks = [...prev.timeline.tasks, next]
          return {
            ...prev,
            timeline: recomputeMetrics({ ...prev.timeline, tasks }),
            isDirty: true,
            editingTaskId: next.id,
          }
        })

        // Now async: create backend task and stitch in the MongoDB _id
        if (s.timelineProjectId) {
          const projectId = s.timelineProjectId
          createBackendTask(projectId, next).then((mongoId) => {
            if (!mongoId) return
            set((prev) => {
              if (!prev.timeline) return prev
              const tasks = prev.timeline.tasks.map((t) =>
                t.id === next.id ? { ...t, backendTaskId: mongoId } : t,
              )
              return { ...prev, timeline: { ...prev.timeline, tasks } }
            })
          })
        }
      },

      deleteTask: (taskId) =>
        set((s) => {
          if (!s.timeline) return s
          const orig = s.timeline.tasks.find((t) => t.id === taskId)
          const tasks = s.timeline.tasks
            .filter((t) => t.id !== taskId)
            .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((x) => x !== taskId) }))
          if (s.timelineProjectId && orig) {
            syncGanttTaskDelete(s.timelineProjectId, taskId, orig.backendTaskId)
          }
          return {
            ...s,
            timeline: recomputeMetrics({ ...s.timeline, tasks }),
            isDirty: true,
            editingTaskId: s.editingTaskId === taskId ? null : s.editingTaskId,
          }
        }),

      // ── view filters ───────────────────────────────────────────────────────
      setPhaseFilter: (phase) => set({ selectedPhaseFilter: phase }),
      setZoomLevel: (level) => set({ zoomLevel: level }),
      toggleDependencies: () => set((s) => ({ showDependencies: !s.showDependencies })),
      toggleBaseline: () => set((s) => ({ showBaseline: !s.showBaseline })),
      toggleCriticalPath: () => set((s) => ({ showCriticalPath: !s.showCriticalPath })),
      setEditingTaskId: (id) => set({ editingTaskId: id }),

      // ── save / publish ─────────────────────────────────────────────────────
      markPublished: () => {
        set((s) => {
          if (!s.timeline) return s
          const versionNum = Number(String(s.timeline.version).replace(/[^\d]/g, '')) || 1
          const nextVersion = `V${versionNum + 1}`
          return { ...s, timeline: { ...s.timeline, version: nextVersion, lastSynced: new Date() }, isDirty: false }
        })
        const { timeline, timelineProjectId } = get()
        if (timeline && timelineProjectId) persistTimelineToServer(timelineProjectId, timeline)
      },

      applyRecoveryAction: (actionId) =>
        set((s) => {
          if (!s.timeline) return s
          const action = s.timeline.recoveryActions.find((a) => a.id === actionId) as RecoveryAction | undefined
          if (!action) return s
          const forecastedCompletionDate = addDays(s.timeline.forecastedCompletionDate, -Math.max(0, action.savingDays))
          const delayDays = Math.max(0, diffDays(s.timeline.plannedCompletionDate, forecastedCompletionDate))
          return {
            ...s,
            timeline: { ...s.timeline, forecastedCompletionDate, delayDays, status: delayDays > 28 ? 'Delayed' : 'At Risk' },
            isDirty: true,
          }
        }),

      saveChanges: () => {
        set((s) => {
          if (!s.timeline) return s
          return { ...s, timeline: { ...s.timeline, lastSynced: new Date() }, isDirty: false }
        })
        const { timeline, timelineProjectId } = get()
        if (timeline && timelineProjectId) persistTimelineToServer(timelineProjectId, timeline)
      },

      setTimeline: (next) =>
        set(() => {
          const restored = deepCloneTimeline(next)
          restored.tasks = restored.tasks.map((t) => recomputeTaskDerived(t))
          return { timeline: recomputeMetrics(restored), isDirty: true }
        }),
    }),
    {
      name: STORAGE,
      partialize: (s) => ({
        selectedPhaseFilter: s.selectedPhaseFilter,
        zoomLevel: s.zoomLevel,
        showDependencies: s.showDependencies,
        showBaseline: s.showBaseline,
        showCriticalPath: s.showCriticalPath,
      }),
    },
  ),
)

// ─── merge helper (outside store to avoid closure issues) ────────────────────

/**
 * Fetch the latest task data from the backend Tasks collection and merge
 * status/progress updates into the in-memory Gantt tasks.
 * Tasks that exist in Gantt but not in backend are left untouched.
 * Tasks in backend but not in Gantt (added by workers) get added.
 */
async function mergeBackendTaskUpdates(tl: ProjectTimeline, projectId: string): Promise<ProjectTimeline> {
  const list = await fetchWorkerTasks(projectId)
  if (!Array.isArray(list) || list.length === 0) return tl

  const backendById = new Map<string, Record<string, unknown>>()
  const backendByGanttId = new Map<string, Record<string, unknown>>()
  for (const t of list as Record<string, unknown>[]) {
    if (t.id) backendById.set(String(t.id), t)
    if (t.ganttTaskId) backendByGanttId.set(String(t.ganttTaskId), t)
  }

  const now = new Date()
  const updatedTasks = tl.tasks.map((ganttTask) => {
    // Look up by backendTaskId first, then by ganttTaskId cross-ref
    const backendTask =
      (ganttTask.backendTaskId ? backendById.get(ganttTask.backendTaskId) : undefined) ??
      backendByGanttId.get(ganttTask.id)
    if (!backendTask) return ganttTask

    return recomputeTaskDerived({
      ...ganttTask,
      backendTaskId: backendTask.id ? String(backendTask.id) : ganttTask.backendTaskId,
      status: normalizeGanttStatus((backendTask.status as string) || ''),
      percentComplete: typeof backendTask.progressPct === 'number' ? backendTask.progressPct : ganttTask.percentComplete,
      assignedCrew: (backendTask.assignedTo as string) || ganttTask.assignedCrew,
    })
  })

  // Add backend tasks that aren't in the Gantt yet (e.g. added from MyTasksPage directly)
  const ganttIds = new Set(tl.tasks.map((t) => t.id))
  const ganttBackendIds = new Set(tl.tasks.map((t) => t.backendTaskId).filter(Boolean))
  const newTasks: GanttTask[] = []
  for (const bt of list as Record<string, unknown>[]) {
    const isInGantt =
      (bt.ganttTaskId && ganttIds.has(bt.ganttTaskId as string)) ||
      (bt.id && ganttBackendIds.has(bt.id as string))
    if (!isInGantt) {
      newTasks.push(backendTaskToGantt(bt, now))
    }
  }

  return { ...tl, tasks: [...updatedTasks, ...newTasks] }
}
