export type RfiStatus = 'Open' | 'In Review' | 'Awaiting Response' | 'Answered' | 'Closed' | 'Escalated'

export type RfiPriority = 'Critical' | 'High' | 'Medium' | 'Low'

export type RfiCategory = 'Structure' | 'MEP' | 'Architecture' | 'Facade' | 'Finishing' | 'General'

export type RfiAttachment = {
  id: string
  kind: 'photo' | 'drawing' | 'document'
  name: string
  url?: string
}

export type RfiComment = {
  id: string
  kind: 'question' | 'response' | 'comment' | 'decision'
  author: string
  at: string // ISO
  text: string
}

export type RfiApproval = {
  approvedBy: string
  approvedAt: string // ISO
  resolution: string
}

export type RfiItem = {
  id: string
  title: string
  description: string
  category: RfiCategory
  priority: RfiPriority
  status: RfiStatus

  raisedBy: string
  assignedTo: string
  raisedAt: string // ISO
  dueAt: string // ISO

  linkedDoc?: string
  linkedTask?: string
  linkedPhase?: string
  location?: string

  attachments: RfiAttachment[]
  thread: RfiComment[]
  approval: RfiApproval | null
}

export type RfiMetrics = {
  open: number
  overdue: number
  answeredThisWeek: number
  avgResponseHours: number
  escalated: number
  critical: number
}

