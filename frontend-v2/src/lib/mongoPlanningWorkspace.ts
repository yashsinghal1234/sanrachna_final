import { createEmptyWorkspace } from '@/lib/workspaceFactory'
import type { PlanningFormValues } from '@/planning/planningSchema'
import type { ChatMessage, PlanningReport, PlanningStep } from '@/types/planning.types'
import type {
  ManualEditEntry,
  ModuleSyncMeta,
  PlanVersionEntry,
  ProjectWorkspace,
} from '@/types/projectWorkspace.types'

type MongoProjectPayload = {
  name?: string
  planning?: {
    sanrachnaStudio?: Record<string, unknown>
  }
}

export function mongoDetailToWorkspace(
  id: string,
  name: string,
  detail: MongoProjectPayload | null | undefined,
): ProjectWorkspace {
  const base = createEmptyWorkspace(name, id)
  const studio = detail?.planning?.sanrachnaStudio
  if (!studio || typeof studio !== 'object') return base

  return {
    ...base,
    currentForm: (studio.currentForm as PlanningFormValues) ?? base.currentForm,
    lastGeneratedReport: (studio.lastGeneratedReport as PlanningReport | null) ?? base.lastGeneratedReport,
    masterPlan: (studio.masterPlan as PlanningReport | null) ?? base.masterPlan,
    planningStep: (studio.planningStep as PlanningStep) ?? base.planningStep,
    isApproved: typeof studio.isApproved === 'boolean' ? studio.isApproved : base.isApproved,
    chatHistory: Array.isArray(studio.chatHistory) ? (studio.chatHistory as ChatMessage[]) : base.chatHistory,
    planVersions: Array.isArray(studio.planVersions) ? (studio.planVersions as PlanVersionEntry[]) : base.planVersions,
    currentVersionLabel:
      typeof studio.currentVersionLabel === 'string' ? studio.currentVersionLabel : base.currentVersionLabel,
    moduleSync: (studio.moduleSync as Record<string, ModuleSyncMeta>) ?? base.moduleSync,
    editHistory: Array.isArray(studio.editHistory) ? (studio.editHistory as ManualEditEntry[]) : base.editHistory,
  }
}
