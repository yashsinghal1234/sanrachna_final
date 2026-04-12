import { create } from 'zustand'

import {
  fetchWorkspaceIssues,
  createWorkspaceIssue,
  updateWorkspaceIssue,
} from '@/api/resources'
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, ISSUE_STATUSES } from '@/constants/issues'
import type {
  IssueAttachment,
  IssueCategory,
  IssueItem,
  IssueMetrics,
  IssueProgressLog,
  IssueSeverity,
  IssueStatus,
  IssueVerification,
} from '@/types/issue.types'

function nowIso() {
  return new Date().toISOString()
}

function parseIso(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function daysBetween(aIso: string, bIso: string) {
  const a = parseIso(aIso).getTime()
  const b = parseIso(bIso).getTime()
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)))
}

function isOverdue(i: IssueItem) {
  if (i.status === 'Closed') return false
  return parseIso(i.dueAt).getTime() < Date.now() && i.status !== 'Verified'
}

function resolvedWithinWeek(i: IssueItem) {
  if (i.status !== 'Resolved' && i.status !== 'Verified' && i.status !== 'Closed') return false
  const last = [...i.progressLog].reverse().find((x) => x.status === 'Resolved' || x.status === 'Verified' || x.status === 'Closed')
  const at = last?.at ? parseIso(last.at).getTime() : parseIso(i.raisedAt).getTime()
  return Date.now() - at <= 7 * 24 * 60 * 60 * 1000
}

function avgResolutionDays(items: IssueItem[]) {
  const done = items.filter((i) => i.status === 'Resolved' || i.status === 'Verified' || i.status === 'Closed')
  if (!done.length) return 0
  const days = done.map((i) => {
    const last = [...i.progressLog].reverse().find((x) => x.status === 'Resolved' || x.status === 'Verified' || x.status === 'Closed')
    return last ? daysBetween(i.raisedAt, last.at) : 0
  })
  return Math.round(days.reduce((a, n) => a + n, 0) / done.length)
}

export function computeIssueMetrics(items: IssueItem[]): IssueMetrics {
  const openIssues = items.filter((i) => i.status !== 'Closed').length
  const criticalIssues = items.filter((i) => i.severity === 'Critical' && i.status !== 'Closed').length
  const overdueIssues = items.filter(isOverdue).length
  const resolvedThisWeek = items.filter(resolvedWithinWeek).length
  const verificationPending = items.filter((i) => i.status === 'Resolved').length
  const avgResolutionDaysValue = avgResolutionDays(items)
  return { openIssues, criticalIssues, overdueIssues, resolvedThisWeek, verificationPending, avgResolutionDays: avgResolutionDaysValue }
}

function newLocalId() {
  const n = String(Math.floor(100 + Math.random() * 900))
  return `ISS-${n}`
}

type IssueDraft = {
  projectId: string
  title: string
  description: string
  category: IssueCategory
  severity: IssueSeverity
  location: string
  zone?: string
  floor?: string
  area?: string
  dueDays: number
  reportedBy: string
  attachmentName?: string
}

export type IssueState = {
  issuesByProject: Record<string, IssueItem[]>
  selectedId: string | null
  isDirty: boolean
  loadStatus: 'idle' | 'loading' | 'ready' | 'error'
  loadError: string | null
  loadedProjectId: string | null

  filterStatus: IssueStatus | 'All'
  filterSeverity: IssueSeverity | 'All'
  filterCategory: IssueCategory | 'All'
  search: string
  view: 'kanban' | 'table'

  fetchIssues: (projectId: string | null) => Promise<void>

  setSelected: (id: string | null) => void
  setFilters: (patch: Partial<Pick<IssueState, 'filterStatus' | 'filterSeverity' | 'filterCategory' | 'search'>>) => void
  setView: (v: IssueState['view']) => void

  createIssue: (draft: IssueDraft) => string
  updateIssue: (projectId: string, id: string, patch: Partial<IssueItem>) => void
  assignIssue: (projectId: string, id: string, assignedTo: string) => void
  moveStatus: (projectId: string, id: string, status: IssueStatus, author: string, note?: string) => void
  addProgress: (projectId: string, id: string, author: string, note: string, status?: IssueStatus) => void
  verifyIssue: (projectId: string, id: string, verifiedBy: string, notes: string, afterPhotoName?: string) => void
  closeIssue: (projectId: string, id: string, author: string) => void

  saveChanges: () => void
}

export const useIssueStore = create<IssueState>()((set, get) => ({
  issuesByProject: {},
  selectedId: null,
  isDirty: false,
  loadStatus: 'idle',
  loadError: null,
  loadedProjectId: null,

  filterStatus: 'All',
  filterSeverity: 'All',
  filterCategory: 'All',
  search: '',
  view: 'kanban',

  fetchIssues: async (projectId) => {
    if (!projectId) {
      set({ issuesByProject: {}, loadStatus: 'ready', loadError: null, loadedProjectId: null })
      return
    }
    set({ loadStatus: 'loading', loadError: null })
    try {
      const rows = await fetchWorkspaceIssues(projectId)
      const hardened = rows.map((i) => ({
        ...i,
        status: (ISSUE_STATUSES.includes(i.status) ? i.status : 'Reported') as IssueStatus,
        severity: (ISSUE_SEVERITIES.includes(i.severity) ? i.severity : 'Medium') as IssueSeverity,
        category: (ISSUE_CATEGORIES.includes(i.category) ? i.category : 'Other') as IssueCategory,
        progressLog: Array.isArray(i.progressLog) ? i.progressLog : [],
        attachments: Array.isArray(i.attachments) ? i.attachments : [],
      }))
      set((s) => ({
        issuesByProject: { ...s.issuesByProject, [projectId]: hardened },
        loadStatus: 'ready',
        loadError: null,
        loadedProjectId: projectId,
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load issues'
      set((s) => ({
        issuesByProject: { ...s.issuesByProject, [projectId]: s.issuesByProject[projectId] ?? [] },
        loadStatus: 'error',
        loadError: msg,
        loadedProjectId: projectId,
      }))
    }
  },

  setSelected: (selectedId) => set({ selectedId }),
  setFilters: (patch) => set((s) => ({ ...s, ...patch })),
  setView: (view) => set({ view }),

  createIssue: (draft) => {
    const localId = newLocalId()
    const dueAt = new Date(Date.now() + Math.max(1, draft.dueDays) * 24 * 60 * 60 * 1000).toISOString()
    const attId = draft.attachmentName ? `att_${Date.now().toString(36)}` : null
    const issue: IssueItem = {
      id: localId,
      projectId: draft.projectId,
      title: draft.title.trim() || 'Untitled issue',
      description: draft.description.trim() || '—',
      category: draft.category,
      severity: draft.severity,
      status: 'Reported',
      reportedBy: draft.reportedBy,
      assignedTo: null,
      raisedAt: nowIso(),
      dueAt,
      location: draft.location,
      zone: draft.zone,
      floor: draft.floor,
      area: draft.area,
      attachments: draft.attachmentName
        ? [{ id: attId!, kind: 'photo', name: draft.attachmentName, stage: 'evidence' }]
        : [],
      progressLog: [
        {
          id: `${localId}_Reported_${Date.now().toString(36)}`,
          at: nowIso(),
          author: draft.reportedBy,
          status: 'Reported',
          note: 'Reported new issue.',
        },
      ],
      resolutionNotes: null,
      verification: null,
    }

    // Optimistic local update
    set((s) => ({
      ...s,
      issuesByProject: {
        ...s.issuesByProject,
        [draft.projectId]: [issue, ...(s.issuesByProject[draft.projectId] ?? [])],
      },
      selectedId: localId,
    }))

    // Persist to backend (fire-and-forget, update with real id when response comes)
    createWorkspaceIssue(draft.projectId, {
      id: localId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      status: issue.status,
      reportedBy: issue.reportedBy,
      raisedAt: issue.raisedAt,
      dueAt: issue.dueAt,
      location: issue.location,
      zone: issue.zone || '',
      floor: issue.floor || '',
      area: issue.area || '',
      attachments: issue.attachments,
      progressLog: issue.progressLog,
    }).then((saved) => {
      // Replace local issue with server-saved one (keeping same ID for UI stability)
      set((s) => ({
        issuesByProject: {
          ...s.issuesByProject,
          [draft.projectId]: (s.issuesByProject[draft.projectId] ?? []).map((item) =>
            item.id === localId ? { ...item, ...saved, id: saved.id || localId } : item
          ),
        },
      }))
    }).catch(() => {
      // Silently keep local version if API fails
    })

    return localId
  },

  updateIssue: (projectId, id, patch) => {
    set((s) => ({
      ...s,
      issuesByProject: {
        ...s.issuesByProject,
        [projectId]: (s.issuesByProject[projectId] ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i)),
      },
      isDirty: true,
    }))
    // Persist
    updateWorkspaceIssue(projectId, id, patch as Record<string, unknown>).catch(() => {})
  },

  assignIssue: (projectId, id, assignedTo) => get().moveStatus(projectId, id, 'Assigned', 'Engineer', `Assigned to ${assignedTo}`),

  moveStatus: (projectId, id, status, author, note) => {
    set((s) => {
      const arr = s.issuesByProject[projectId] ?? []
      const next = arr.map((i) => {
        if (i.id !== id) return i
        const log: IssueProgressLog = {
          id: `${id}_${status}_${Date.now().toString(36)}`,
          at: nowIso(),
          author,
          status,
          note: note ?? `Moved to ${status}.`,
        }
        return { ...i, status, progressLog: [...i.progressLog, log] }
      })
      return { ...s, issuesByProject: { ...s.issuesByProject, [projectId]: next }, isDirty: true }
    })
    const updated = get().issuesByProject[projectId]?.find((i) => i.id === id)
    if (updated) {
      updateWorkspaceIssue(projectId, id, {
        status: updated.status,
        progressLog: updated.progressLog,
      }).catch(() => {})
    }
  },

  addProgress: (projectId, id, author, note, status) =>
    set((s) => {
      const arr = s.issuesByProject[projectId] ?? []
      const next = arr.map((i) => {
        if (i.id !== id) return i
        const st = status ?? i.status
        const log: IssueProgressLog = {
          id: `${id}_log_${Date.now().toString(36)}`,
          at: nowIso(),
          author,
          status: st,
          note,
        }
        return { ...i, status: st, progressLog: [...i.progressLog, log] }
      })
      return { ...s, issuesByProject: { ...s.issuesByProject, [projectId]: next }, isDirty: true }
    }),

  verifyIssue: (projectId, id, verifiedBy, notes, afterPhotoName) => {
    set((s) => {
      const arr = s.issuesByProject[projectId] ?? []
      const next = arr.map((i) => {
        if (i.id !== id) return i
        const afterId = afterPhotoName ? `att_after_${Date.now().toString(36)}` : undefined
        const afterAttachment: IssueAttachment | null =
          afterPhotoName && afterId ? { id: afterId, kind: 'photo', name: afterPhotoName, stage: 'after' } : null
        const attachments = afterAttachment ? [...i.attachments, afterAttachment] : i.attachments
        const verification: IssueVerification = { verifiedBy, verifiedAt: nowIso(), notes, afterPhotoAttachmentId: afterId }
        const log: IssueProgressLog = {
          id: `${id}_Verified_${Date.now().toString(36)}`,
          at: nowIso(),
          author: verifiedBy,
          status: 'Verified' as IssueStatus,
          note: 'Verified resolution.',
        }
        return { ...i, status: 'Verified' as IssueStatus, verification, attachments, progressLog: [...i.progressLog, log] }
      })
      return { ...s, issuesByProject: { ...s.issuesByProject, [projectId]: next }, isDirty: true }
    })
    const updated = get().issuesByProject[projectId]?.find((i) => i.id === id)
    if (updated) {
      updateWorkspaceIssue(projectId, id, {
        status: updated.status,
        verification: updated.verification,
        progressLog: updated.progressLog,
        attachments: updated.attachments,
      }).catch(() => {})
    }
  },

  closeIssue: (projectId, id, author) => {
    set((s) => {
      const arr = s.issuesByProject[projectId] ?? []
      const next = arr.map((i) => {
        if (i.id !== id) return i
        const log: IssueProgressLog = {
          id: `${id}_Closed_${Date.now().toString(36)}`,
          at: nowIso(),
          author,
          status: 'Closed' as IssueStatus,
          note: 'Closed issue.',
        }
        return { ...i, status: 'Closed' as IssueStatus, progressLog: [...i.progressLog, log] }
      })
      return { ...s, issuesByProject: { ...s.issuesByProject, [projectId]: next }, isDirty: true }
    })
    updateWorkspaceIssue(projectId, id, { status: 'Closed' }).catch(() => {})
  },

  saveChanges: () => set({ isDirty: false }),
}))
