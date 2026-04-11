import type { IssueCategory, IssueSeverity, IssueStatus } from '@/types/issue.types'

export const ISSUE_STATUSES: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved', 'Verified', 'Closed']

export const ISSUE_CATEGORIES: IssueCategory[] = ['Quality', 'Safety', 'Material', 'Rework', 'Snag', 'Execution', 'Other']

export const ISSUE_SEVERITIES: IssueSeverity[] = ['Critical', 'High', 'Medium', 'Low']
