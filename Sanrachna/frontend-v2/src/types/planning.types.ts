/** AI Planning Studio — aligned with product spec JSON schema (colours use app tokens in UI). */

export type PlanningStep = 1 | 2 | 3 | 4

export type Feasibility = 'Feasible' | 'Challenging' | 'Not Feasible'
export type RiskLevel = 'High' | 'Medium' | 'Low'
export type EquipmentRec = 'Buy' | 'Rent' | 'Not needed'

export interface ExecutiveSummary {
  feasibility: Feasibility
  estimatedMonths: number
  estimatedCost: number
  confidencePercent: number
  majorRisks: string[]
  keyAssumptions: string[]
}

export interface CostPhase {
  name: string
  cost: number
  percent: number
}

export interface CostBreakdown {
  totalCost: number
  costPerSqFt: number
  contingencyAmount: number
  phases: CostPhase[]
}

export interface BillOfMaterialRow {
  material: string
  quantity: number
  unit: string
  unitRate: number
  totalCost: number
}

export interface WorkforceByTrade {
  trade: string
  count: number
  phase: string
}

export interface WorkforcePlan {
  totalWorkers: number
  peakWorkers: number
  byTrade: WorkforceByTrade[]
}

export interface EquipmentRow {
  name: string
  recommendation: EquipmentRec
  reason: string
}

export interface TimelinePhase {
  name: string
  months: number
  milestones: string[]
}

export interface TimelinePlan {
  totalMonths: number
  phases: TimelinePhase[]
}

export interface RiskRow {
  risk: string
  level: RiskLevel
  mitigation: string
}

export interface OptimizationRow {
  suggestion: string
  impact: string
  savingAmount: number | null
}

export interface PlanningReport {
  executiveSummary: ExecutiveSummary
  costBreakdown: CostBreakdown
  billOfMaterials: BillOfMaterialRow[]
  workforcePlan: WorkforcePlan
  equipmentPlan: EquipmentRow[]
  timeline: TimelinePlan
  riskForecast: RiskRow[]
  optimizations: OptimizationRow[]
  assumptions: string[]
  revisionSummary?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CustomConstraint {
  key: string
  value: string
}

/** Step 1 form shape: use `PlanningFormValues` from `@/planning/planningSchema`. */
