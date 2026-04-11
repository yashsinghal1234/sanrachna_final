export type AlertPriority = 'critical' | 'warning' | 'info'
export type AlertStatus = 'unread' | 'read' | 'resolved'
export type AlertType =
  | 'budget_overrun'
  | 'delay'
  | 'rfi'
  | 'issue'
  | 'daily_log'
  | 'material'
  | 'inspection'
  | 'emergency'
  | 'compliance'
  | 'approval'
  | 'summary'

export type AlertRole = 'owner' | 'engineer' | 'worker'

export type NotificationAlert = {
  id: string
  role: AlertRole
  project: string
  priority: AlertPriority
  type: AlertType
  title: string
  body: string
  createdAtLabel: string
  status: AlertStatus
  groupKey?: string
  actions: { label: string; to?: string; kind?: 'resolve' | 'assign' | 'forward' }[]
}
