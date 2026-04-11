import { defaultPlanningFormValues } from '@/planning/planningDefaults'
import type { ProjectWorkspace } from '@/types/projectWorkspace.types'

export function createEmptyWorkspace(name: string, id: string): ProjectWorkspace {
  return {
    id,
    name,
    archived: false,
    createdAt: new Date().toISOString(),
    currentForm: { ...defaultPlanningFormValues },
    lastGeneratedReport: null,
    masterPlan: null,
    planningStep: 1,
    isApproved: false,
    chatHistory: [],
    planVersions: [],
    currentVersionLabel: '—',
    moduleSync: {},
    editHistory: [],
  }
}

export function mergeWorkspace(dto: unknown): ProjectWorkspace | null {
  if (!dto || typeof dto !== 'object') return null
  const o = dto as Partial<ProjectWorkspace>
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  const base = createEmptyWorkspace(o.name, o.id)
  return { ...base, ...o, id: o.id, name: o.name }
}
