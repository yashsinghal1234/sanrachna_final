export type Phase =
  | 'Foundation'
  | 'Substructure'
  | 'Superstructure'
  | 'MEP'
  | 'Finishing'
  | 'Handover'

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed' | 'blocked'

export type RiskLevel = 'High' | 'Medium' | 'Low'

export interface GanttTask {
  id: string
  /** MongoDB _id of the synced Task document — set after backend create succeeds. */
  backendTaskId?: string
  name: string
  phase: Phase
  startDate: Date
  endDate: Date
  durationDays: number
  dependsOn: string[]
  assignedCrew: string
  status: TaskStatus
  percentComplete: number
  isCriticalPath: boolean
  isMilestone: boolean
  baselineStart: Date
  baselineEnd: Date
  delayDays: number
}

export interface ResourceWeek {
  weekLabel: string
  workers: number
  capacity: number
  isOverallocated: boolean
  isIdle: boolean
}

export interface RiskItem {
  id: string
  taskName: string
  riskLevel: RiskLevel
  description: string
  delayProbability: number
  impactDays: number
}

export interface RecoveryAction {
  id: string
  suggestion: string
  impact: string
  savingDays: number
  type: 'add-resource' | 'parallelize' | 'shift-procurement' | 'other'
}

export interface ProjectTimeline {
  projectId: string
  projectName: string
  version: string
  lastSynced: Date
  status: 'On Track' | 'At Risk' | 'Delayed' | 'Critical'
  plannedCompletionDate: Date
  forecastedCompletionDate: Date
  delayDays: number
  criticalTaskCount: number
  milestonesRemaining: number
  scheduleHealthScore: number
  tasks: GanttTask[]
  resourceTimeline: ResourceWeek[]
  risks: RiskItem[]
  recoveryActions: RecoveryAction[]
  sCurveData: { week: string; planned: number; actual: number }[]
}

