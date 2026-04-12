export type IssueStatus = 'Reported' | 'Assigned' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed'

export type IssueSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type IssueCategory = 'Quality' | 'Safety' | 'Material' | 'Rework' | 'Snag' | 'Execution' | 'Other'

export type IssueAttachment = {
  id: string
  kind: 'photo' | 'video' | 'document'
  name: string
  url?: string
  stage?: 'before' | 'after' | 'evidence'
}

export type IssueProgressLog = {
  id: string
  at: string // ISO
  author: string
  status: IssueStatus
  note: string
}

export type IssueVerification = {
  verifiedBy: string
  verifiedAt: string // ISO
  notes: string
  afterPhotoAttachmentId?: string
}

export type IssueItem = {
  id: string
  /** Friendly display ID, e.g. ISS-123. Falls back to id if not set. */
  issue_id?: string
  projectId: string

  title: string
  description: string
  category: IssueCategory
  severity: IssueSeverity
  status: IssueStatus

  reportedBy: string
  assignedTo: string | null
  raisedAt: string // ISO
  dueAt: string // ISO

  location: string
  zone?: string
  floor?: string
  area?: string

  linkedTask?: string
  linkedPhase?: string
  linkedRfiId?: string

  attachments: IssueAttachment[]
  progressLog: IssueProgressLog[]
  resolutionNotes: string | null
  verification: IssueVerification | null
}

export type IssueMetrics = {
  openIssues: number
  criticalIssues: number
  overdueIssues: number
  resolvedThisWeek: number
  verificationPending: number
  avgResolutionDays: number
}

