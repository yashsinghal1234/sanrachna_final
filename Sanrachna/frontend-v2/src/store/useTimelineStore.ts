import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { fetchWorkspaceTimeline } from '@/api/resources'
import { apiGetProject, apiPatchPlanningTimeline } from '@/api/projectTeamApi'
import { normalizeProjectTimeline } from '@/api/timelineNormalize'
import { isBackendConfigured } from '@/api/http'
import { timelineToStoredJson } from '@/lib/timelineSerialize'
import type { GanttTask, Phase, ProjectTimeline, RecoveryAction } from '@/types/timeline.types'

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

function persistTimelineToServer(projectId: string, timeline: ProjectTimeline) {
  if (!isBackendConfigured() || !MONGO_ID_RE.test(projectId)) return
  void apiPatchPlanningTimeline(projectId, { timeline: timelineToStoredJson(timeline) }).catch(() => {})
}

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

      fetchTimeline: async (projectId, projectName) => {
        if (!projectId) {
          set({ timeline: null, timelineLoadStatus: 'ready', timelineLoadError: null, timelineProjectId: null })
          return
        }
        set({ timelineLoadStatus: 'loading', timelineLoadError: null })
        try {
          if (isBackendConfigured() && MONGO_ID_RE.test(projectId)) {
            try {
              const { project } = await apiGetProject(projectId)
              const planning = project.planning && typeof project.planning === 'object' ? project.planning : null
              const raw = planning && 'timeline' in planning ? (planning as { timeline?: unknown }).timeline : undefined
              if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                const name = projectName || project.name || 'Project'
                const tl = normalizeProjectTimeline(raw, projectId, name)
                if (tl) {
                  set({
                    timeline: deepCloneTimeline(tl),
                    timelineLoadStatus: 'ready',
                    timelineLoadError: null,
                    timelineProjectId: projectId,
                    isDirty: false,
                  })
                  return
                }
              }
            } catch {
              // fall through to workspace stub API
            }
          }

          const tl = await fetchWorkspaceTimeline(projectId, projectName)
          if (!tl) {
            set({
              timeline: null,
              timelineLoadStatus: 'ready',
              timelineLoadError: 'No schedule returned for this project.',
              timelineProjectId: projectId,
            })
            return
          }
          set({
            timeline: deepCloneTimeline(tl),
            timelineLoadStatus: 'ready',
            timelineLoadError: null,
            timelineProjectId: projectId,
            isDirty: false,
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to load schedule'
          set({
            timeline: null,
            timelineLoadStatus: 'error',
            timelineLoadError: msg,
            timelineProjectId: projectId,
          })
        }
      },

      updateTask: (taskId, patch) =>
        set((s) => {
          if (!s.timeline) return s
          const tasks = s.timeline.tasks.map((t) => (t.id === taskId ? recomputeTaskDerived({ ...t, ...patch } as GanttTask) : t))
          return { ...s, timeline: { ...s.timeline, tasks }, isDirty: true }
        }),

      addTask: (task) =>
        set((s) => {
          if (!s.timeline) return s
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
          })
          return { ...s, timeline: { ...s.timeline, tasks: [...s.timeline.tasks, next] }, isDirty: true, editingTaskId: next.id }
        }),

      deleteTask: (taskId) =>
        set((s) => {
          if (!s.timeline) return s
          const tasks = s.timeline.tasks.filter((t) => t.id !== taskId).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((x) => x !== taskId) }))
          return { ...s, timeline: { ...s.timeline, tasks }, isDirty: true, editingTaskId: s.editingTaskId === taskId ? null : s.editingTaskId }
        }),

      setPhaseFilter: (phase) => set({ selectedPhaseFilter: phase }),
      setZoomLevel: (level) => set({ zoomLevel: level }),
      toggleDependencies: () => set((s) => ({ showDependencies: !s.showDependencies })),
      toggleBaseline: () => set((s) => ({ showBaseline: !s.showBaseline })),
      toggleCriticalPath: () => set((s) => ({ showCriticalPath: !s.showCriticalPath })),
      setEditingTaskId: (id) => set({ editingTaskId: id }),

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

          // Simple demo effect: pull forecast earlier by savingDays and mark as dirty.
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
          return { timeline: restored, isDirty: true }
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

