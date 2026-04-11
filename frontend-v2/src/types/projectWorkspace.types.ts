import type { PlanningFormValues } from '@/planning/planningSchema'
import type { ChatMessage, PlanningReport, PlanningStep } from '@/types/planning.types'

export type ModuleSyncStatus = 'Synced' | 'Pending' | 'Stale'

export interface PlanVersionEntry {
  id: string
  label: string
  createdAt: string
  /** Snapshot at approval time */
  report: PlanningReport
  form: PlanningFormValues
}

export interface ModuleSyncMeta {
  moduleKey: string
  versionLabel: string
  lastSyncedAt: string
  taskCount: number
  status: ModuleSyncStatus
}

export interface ManualEditEntry {
  id: string
  at: string
  actor: string
  summary: string
  modulesAffected: string[]
}

export interface ProjectWorkspace {
  id: string
  name: string
  archived: boolean
  createdAt: string
  currentForm: PlanningFormValues
  /** Latest AI output (draft until approved). */
  lastGeneratedReport: PlanningReport | null
  /** Locked approved plan used to populate modules. */
  masterPlan: PlanningReport | null
  planningStep: PlanningStep
  isApproved: boolean
  chatHistory: ChatMessage[]
  planVersions: PlanVersionEntry[]
  currentVersionLabel: string
  moduleSync: Record<string, ModuleSyncMeta>
  editHistory: ManualEditEntry[]
}
