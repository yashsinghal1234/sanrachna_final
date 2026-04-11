export type ProjectPhase = 'foundation' | 'structure' | 'mep' | 'finishing'

export interface ProjectSummary {
  id: string
  name: string
  location: string
  area_sqm: number
  project_type: string
  target_completion: string
  currency: 'INR'
}

export interface CostBreakdown {
  foundation_inr: number
  structure_inr: number
  mep_inr: number
  finishing_inr: number
  contingency_inr: number
  total_inr: number
}

export interface ResourceLine {
  id: string
  material: string
  quantity: string
  unit: string
  benchmark_rate_inr: number
  extended_inr: number
  supplier_hint: string
}

export interface TimelineTask {
  id: string
  name: string
  phase: ProjectPhase
  start_week: number
  end_week: number
  dependency_ids: string[]
  pct_complete: number
}

export interface GanttRow {
  taskId: string
  taskName: string
  resource: string
  start: Date
  end: Date
  duration: number | null
  percentComplete: number
  dependencies: string | null
}

export interface DailyLogEntry {
  id: string
  date: string
  tasks_completed: string
  workers_present: number
  issues: string
  photo_url: string | null
  author: string
  /** From Mongo API: pending until engineer approves (then workers_present counts toward attendance). */
  status?: 'pending' | 'approved' | 'rejected' | string
  createdAt?: string
  submittedBy?: string | null
  submittedByName?: string | null
  photoCapturedAt?: string | null
  photoUploadedAt?: string | null
}

export type RfiStatus = 'open' | 'in_progress' | 'answered'

export interface RfiItemLegacy {
  id: string
  description: string
  status: RfiStatus
  assignee: string
  raised_by: string
  raised_at: string
  image_url: string | null
}

export type IssueSeverityLegacy = 'low' | 'medium' | 'high' | 'critical'

export type IssueStatusLegacy = 'open' | 'in_progress' | 'resolved' | 'verified'

export interface IssueItemLegacy {
  id: string
  description: string
  severity: IssueSeverityLegacy
  status: IssueStatusLegacy
  location: string
  raised_at: string
  assignee: string
  photo_url: string | null
}

export interface ContactRow {
  id: string
  name: string
  role: string
  phone: string
  email: string
  phase: string
}

export interface ActivityItem {
  id: string
  type: 'log' | 'rfi' | 'issue' | 'alert'
  title: string
  detail: string
  at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { label: string; doc: string; clause?: string }[]
}
