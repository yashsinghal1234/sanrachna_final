import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { createWorkspace as apiCreateWorkspace, fetchWorkspaceList } from '@/api/resources'
import { apiGetProject, apiListProjects } from '@/api/projectTeamApi'
import { ApiRequestError, isBackendConfigured } from '@/api/http'
import { mongoDetailToWorkspace } from '@/lib/mongoPlanningWorkspace'
import { createEmptyWorkspace } from '@/lib/workspaceFactory'
import { PROJECT_MODULE_CARDS } from '@/planning/projectModules'
import type { PlanningFormValues } from '@/planning/planningSchema'
import type { ChatMessage, PlanningReport } from '@/types/planning.types'
import type {
  ManualEditEntry,
  ModuleSyncMeta,
  PlanVersionEntry,
  ProjectWorkspace,
} from '@/types/projectWorkspace.types'
import type { PlanningStep } from '@/types/planning.types'

const STORAGE = 'sanrachna_projects_v2'

function newId() {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function computeModuleSyncFromReport(report: PlanningReport, versionLabel: string): Record<string, ModuleSyncMeta> {
  const now = new Date().toISOString()
  const milestoneCount = report.timeline.phases.reduce((a, p) => a + p.milestones.length, 0)
  const workforce = report.workforcePlan.byTrade.reduce((a, t) => a + t.count, 0)
  const tasks = milestoneCount + workforce + report.billOfMaterials.length * 3
  const taskCount = Math.max(12, Math.min(999, tasks))

  return Object.fromEntries(
    PROJECT_MODULE_CARDS.map((c) => [
      c.key,
      {
        moduleKey: c.key,
        versionLabel,
        lastSyncedAt: now,
        taskCount,
        status: 'Synced' as const,
      },
    ]),
  )
}

type ProjectsState = {
  projects: Record<string, ProjectWorkspace>
  currentProjectId: string | null
  projectsLoadStatus: 'idle' | 'loading' | 'ready' | 'error'
  projectsLoadError: string | null

  setCurrentProjectId: (id: string | null) => void
  fetchProjects: () => Promise<void>
  createProject: (name: string) => Promise<string>
  duplicateProject: (id: string) => string | null
  archiveProject: (id: string) => void
  renameProject: (id: string, name: string) => void

  patchProject: (id: string, patch: Partial<ProjectWorkspace>) => void
  updateProjectForm: (id: string, form: PlanningFormValues) => void
  updatePlanningSession: (
    id: string,
    slice: {
      formData: PlanningFormValues
      lastGeneratedReport: PlanningReport | null
      planningStep: PlanningStep
      isApproved: boolean
      chatHistory: ChatMessage[]
    },
  ) => void

  /** After AI generates a report (pre-approval). */
  applyGeneratedReport: (id: string, form: PlanningFormValues, report: PlanningReport, step: PlanningStep) => void

  /** On approve: lock master plan, version bump, module sync, history. */
  recordApproval: (id: string, form: PlanningFormValues, report: PlanningReport, actor?: string) => void

  appendManualEdit: (id: string, entry: Omit<ManualEditEntry, 'id'>) => void

  getProject: (id: string) => ProjectWorkspace | undefined
  getCurrentProject: () => ProjectWorkspace | undefined
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => {
      return {
        projects: {},
        currentProjectId: null,
        projectsLoadStatus: 'idle',
        projectsLoadError: null,

        setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

        fetchProjects: async () => {
          set({ projectsLoadStatus: 'loading', projectsLoadError: null })
          try {
            if (isBackendConfigured()) {
              const { projects: mongoList } = await apiListProjects()
              const byId: Record<string, ProjectWorkspace> = {}
              for (const p of mongoList) {
                try {
                  const { project } = await apiGetProject(p.id)
                  byId[p.id] = mongoDetailToWorkspace(p.id, p.name, project)
                } catch {
                  byId[p.id] = createEmptyWorkspace(p.name, p.id)
                }
              }
              const { currentProjectId } = get()
              const nextCurrent =
                currentProjectId && byId[currentProjectId]
                  ? currentProjectId
                  : (mongoList[0]?.id ?? null)
              set({
                projects: byId,
                currentProjectId: nextCurrent,
                projectsLoadStatus: 'ready',
                projectsLoadError: null,
              })
              return
            }

            const list = await fetchWorkspaceList()
            const projects = Object.fromEntries(list.map((p) => [p.id, p]))
            const { currentProjectId } = get()
            const nextCurrent =
              currentProjectId && projects[currentProjectId]
                ? currentProjectId
                : (list.find((p) => !p.archived)?.id ?? null)
            set({
              projects,
              currentProjectId: nextCurrent,
              projectsLoadStatus: 'ready',
              projectsLoadError: null,
            })
          } catch (e) {
            const msg = e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : 'Failed to load workspaces'
            set({
              projects: {},
              currentProjectId: null,
              projectsLoadStatus: 'error',
              projectsLoadError: msg,
            })
          }
        },

        createProject: async (name) => {
          const p = await apiCreateWorkspace(name.trim() || 'Untitled project')
          set((s) => ({
            projects: { ...s.projects, [p.id]: p },
            currentProjectId: p.id,
          }))
          return p.id
        },

        duplicateProject: (id) => {
          const src = get().projects[id]
          if (!src) return null
          const nid = newId()
          const copy: ProjectWorkspace = {
            ...JSON.parse(JSON.stringify(src)) as ProjectWorkspace,
            id: nid,
            name: `${src.name} (copy)`,
            createdAt: new Date().toISOString(),
            archived: false,
          }
          set((s) => ({
            projects: { ...s.projects, [nid]: copy },
            currentProjectId: nid,
          }))
          return nid
        },

        archiveProject: (id) => {
          const { projects, currentProjectId } = get()
          const next = { ...projects, [id]: { ...projects[id]!, archived: true } }
          const ids = Object.keys(next).filter((i) => !next[i]!.archived)
          let nextCurrent = currentProjectId
          if (currentProjectId === id || !nextCurrent || !ids.includes(nextCurrent)) {
            nextCurrent = ids[0] ?? null
          }
          set({ projects: next, currentProjectId: nextCurrent })
        },

        renameProject: (id, name) => {
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            return { projects: { ...s.projects, [id]: { ...p, name } } }
          })
        },

        patchProject: (id, patch) =>
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            return { projects: { ...s.projects, [id]: { ...p, ...patch } } }
          }),

        updateProjectForm: (id, form) =>
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            return { projects: { ...s.projects, [id]: { ...p, currentForm: form } } }
          }),

        updatePlanningSession: (id, slice) =>
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            return {
              projects: {
                ...s.projects,
                [id]: {
                  ...p,
                  currentForm: slice.formData,
                  lastGeneratedReport: slice.lastGeneratedReport,
                  planningStep: slice.planningStep,
                  isApproved: slice.isApproved,
                  chatHistory: slice.chatHistory,
                },
              },
            }
          }),

        applyGeneratedReport: (id, form, report, step) =>
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            return {
              projects: {
                ...s.projects,
                [id]: {
                  ...p,
                  currentForm: form,
                  lastGeneratedReport: report,
                  planningStep: step,
                },
              },
            }
          }),

        recordApproval: (id, form, report, actor = 'Engineer') => {
          const p = get().projects[id]
          if (!p) return
          const nextN = p.planVersions.length + 1
          const versionLabel = `V${nextN}`
          const entry: PlanVersionEntry = {
            id: newId(),
            label: `${versionLabel} – Final approved plan`,
            createdAt: new Date().toISOString(),
            report,
            form,
          }
          const moduleSync = computeModuleSyncFromReport(report, versionLabel)
          const hist: ManualEditEntry = {
            id: newId(),
            at: new Date().toISOString(),
            actor,
            summary: `Approved ${versionLabel}. Master plan locked; downstream modules populated.`,
            modulesAffected: PROJECT_MODULE_CARDS.map((c) => c.title),
          }
          set((s) => ({
            projects: {
              ...s.projects,
              [id]: {
                ...p,
                currentForm: form,
                masterPlan: report,
                lastGeneratedReport: report,
                isApproved: true,
                planningStep: 4,
                planVersions: [...p.planVersions, entry],
                currentVersionLabel: versionLabel,
                moduleSync,
                editHistory: [...p.editHistory, hist],
              },
            },
          }))
        },

        appendManualEdit: (id, entry) =>
          set((s) => {
            const p = s.projects[id]
            if (!p) return s
            const e: ManualEditEntry = { ...entry, id: newId() }
            return { projects: { ...s.projects, [id]: { ...p, editHistory: [...p.editHistory, e] } } }
          }),

        getProject: (id) => get().projects[id],
        getCurrentProject: () => {
          const { currentProjectId, projects } = get()
          if (!currentProjectId) return undefined
          return projects[currentProjectId]
        },
      }
    },
    {
      name: STORAGE,
      partialize: (s) => ({ projects: s.projects, currentProjectId: s.currentProjectId }),
    },
  ),
)
