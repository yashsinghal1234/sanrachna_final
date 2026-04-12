import { create } from 'zustand'

import { fetchWorkspaceRfis, createWorkspaceRfi, updateWorkspaceRfi } from '@/api/resources'
import { RFI_STATUSES } from '@/constants/rfi'
import type { RfiItem, RfiMetrics, RfiPriority, RfiStatus } from '@/types/rfi.types'

function nowIso() {
  return new Date().toISOString()
}

function parseIso(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function hoursBetween(aIso: string, bIso: string) {
  const a = parseIso(aIso).getTime()
  const b = parseIso(bIso).getTime()
  return Math.max(0, Math.round((b - a) / (60 * 60 * 1000)))
}

function isOverdue(dueAt: string, status: RfiStatus) {
  if (status === 'Answered' || status === 'Closed') return false
  return parseIso(dueAt).getTime() < Date.now()
}

function isAnsweredThisWeek(item: RfiItem) {
  if (item.status !== 'Answered') return false
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const latest = [...item.thread].reverse().find((c) => c.kind === 'response' || c.kind === 'decision')
  const at = latest?.at ? parseIso(latest.at).getTime() : parseIso(item.raisedAt).getTime()
  return Date.now() - at <= oneWeek
}

function computeAvgResponseHours(items: RfiItem[]) {
  const answered = items.filter((i) => i.status === 'Answered' || i.status === 'Closed')
  if (!answered.length) return 0
  const hrs = answered.map((i) => {
    const firstResponse = i.thread.find((c) => c.kind === 'response' || c.kind === 'decision')
    return firstResponse ? hoursBetween(i.raisedAt, firstResponse.at) : hoursBetween(i.raisedAt, nowIso())
  })
  return Math.round(hrs.reduce((a, n) => a + n, 0) / hrs.length)
}

export type RfiState = {
  rfis: RfiItem[]
  selectedId: string | null
  registerView: 'kanban' | 'table'
  filterStatus: RfiStatus | 'All'
  filterPriority: RfiPriority | 'All'
  search: string
  isDirty: boolean
  loadStatus: 'idle' | 'loading' | 'ready' | 'error'
  loadError: string | null
  loadedProjectId: string | null

  fetchRfis: (projectId: string | null) => Promise<void>

  setSelected: (id: string | null) => void
  setRegisterView: (v: 'kanban' | 'table') => void
  setFilterStatus: (s: RfiStatus | 'All') => void
  setFilterPriority: (p: RfiPriority | 'All') => void
  setSearch: (q: string) => void

  createRfi: (
    projectId: string,
    draft: Omit<RfiItem, 'id' | 'status' | 'raisedAt' | 'thread' | 'attachments' | 'approval'> & {
      attachments?: RfiItem['attachments']
    },
  ) => void
  updateRfi: (projectId: string, id: string, patch: Partial<RfiItem>) => void
  addComment: (projectId: string, id: string, comment: { kind: RfiItem['thread'][number]['kind']; author: string; text: string }) => void
  moveStatus: (projectId: string, id: string, status: RfiStatus) => void
  escalate: (projectId: string, id: string, reason: string, nextTarget?: string) => void
  saveChanges: () => void
}

export function computeMetrics(items: RfiItem[]): RfiMetrics {
  const open = items.filter((i) => i.status === 'Open').length
  const overdue = items.filter((i) => isOverdue(i.dueAt, i.status)).length
  const answeredThisWeek = items.filter(isAnsweredThisWeek).length
  const avgResponseHours = computeAvgResponseHours(items)
  const escalated = items.filter((i) => i.status === 'Escalated').length
  const critical = items.filter((i) => i.priority === 'Critical').length
  return { open, overdue, answeredThisWeek, avgResponseHours, escalated, critical }
}

export function computeAutoEscalations(items: RfiItem[]) {
  const now = Date.now()
  const nearing = items
    .filter((i) => i.status !== 'Answered' && i.status !== 'Closed')
    .map((i) => {
      const due = parseIso(i.dueAt).getTime()
      const msLeft = due - now
      return { item: i, msLeft }
    })
    .filter((x) => x.msLeft <= 24 * 60 * 60 * 1000)
    .sort((a, b) => a.msLeft - b.msLeft)

  const breached48h = items
    .filter((i) => i.status !== 'Answered' && i.status !== 'Closed')
    .filter((i) => Date.now() - parseIso(i.raisedAt).getTime() > 48 * 60 * 60 * 1000)

  return { nearing, breached48h }
}

function newId() {
  return `RFI-${String(Math.floor(100 + Math.random() * 900))}`
}

export const useRfiStore = create<RfiState>()((set, get) => ({
  rfis: [],
  selectedId: null,
  registerView: 'kanban',
  filterStatus: 'All',
  filterPriority: 'All',
  search: '',
  isDirty: false,
  loadStatus: 'idle',
  loadError: null,
  loadedProjectId: null,

  fetchRfis: async (projectId) => {
    if (!projectId) {
      set({ rfis: [], loadStatus: 'ready', loadError: null, loadedProjectId: null })
      return
    }
    set({ loadStatus: 'loading', loadError: null })
    try {
      const rows = await fetchWorkspaceRfis(projectId)
      const hardened = rows.map((r) => ({
        ...r,
        status: (RFI_STATUSES.includes(r.status) ? r.status : 'Open') as RfiStatus,
        thread: Array.isArray(r.thread) ? r.thread : [],
        attachments: Array.isArray(r.attachments) ? r.attachments : [],
      }))
      set({ rfis: hardened, loadStatus: 'ready', loadError: null, loadedProjectId: projectId })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load RFIs'
      set({ rfis: [], loadStatus: 'error', loadError: msg, loadedProjectId: projectId })
    }
  },

  setSelected: (selectedId) => set({ selectedId }),
  setRegisterView: (registerView) => set({ registerView }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setFilterPriority: (filterPriority) => set({ filterPriority }),
  setSearch: (search) => set({ search }),

  createRfi: (projectId, draft) => {
    const localId = newId()
    const item: RfiItem = {
      id: localId,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      priority: draft.priority,
      status: 'Open',
      raisedBy: draft.raisedBy,
      assignedTo: draft.assignedTo,
      raisedAt: nowIso(),
      dueAt: draft.dueAt,
      linkedDoc: draft.linkedDoc,
      linkedTask: draft.linkedTask,
      linkedPhase: draft.linkedPhase,
      location: draft.location,
      attachments: draft.attachments ?? [],
      thread: [
        {
          id: `${localId}_q1`,
          kind: 'question',
          author: draft.raisedBy,
          at: nowIso(),
          text: draft.description || 'Raised new RFI.',
        },
      ],
      approval: null,
    }

    // Optimistic local add
    set((s) => ({ rfis: [item, ...s.rfis], selectedId: localId, isDirty: true }))

    // Persist to backend
    if (projectId) {
      createWorkspaceRfi(projectId, {
        id: localId,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: item.status,
        raisedBy: item.raisedBy,
        assignedTo: item.assignedTo,
        raisedAt: item.raisedAt,
        dueAt: item.dueAt,
        linkedDoc: item.linkedDoc,
        linkedTask: item.linkedTask,
        linkedPhase: item.linkedPhase,
        location: item.location,
        attachments: item.attachments,
        thread: item.thread,
      }).then((saved) => {
        // Replace local with server version
        set((s) => ({
          rfis: s.rfis.map((r) =>
            r.id === localId ? { ...item, ...saved, id: saved.id || localId } : r,
          ),
        }))
      }).catch(() => {
        // Keep local version on failure
      })
    }
  },

  updateRfi: (projectId, id, patch) => {
    set((s) => ({ rfis: s.rfis.map((r) => (r.id === id ? { ...r, ...patch } : r)), isDirty: true }))
    if (projectId) {
      updateWorkspaceRfi(projectId, id, patch as Record<string, unknown>).catch(() => {})
    }
  },

  addComment: (projectId, id, comment) => {
    const newComment = {
      id: `${id}_${Date.now().toString(36)}`,
      kind: comment.kind,
      author: comment.author,
      at: nowIso(),
      text: comment.text,
    }
    set((s) => ({
      rfis: s.rfis.map((r) =>
        r.id === id ? { ...r, thread: [...r.thread, newComment] } : r,
      ),
      isDirty: true,
    }))
    const updated = get().rfis.find((r) => r.id === id)
    if (projectId && updated) {
      updateWorkspaceRfi(projectId, id, { thread: updated.thread }).catch(() => {})
    }
  },

  moveStatus: (projectId, id, status) => {
    set((s) => ({
      rfis: s.rfis.map((r) => (r.id === id ? { ...r, status } : r)),
      isDirty: true,
    }))
    if (projectId) {
      updateWorkspaceRfi(projectId, id, { status }).catch(() => {})
    }
  },

  escalate: (projectId, id, reason, nextTarget) => {
    const escComment = {
      id: `${id}_esc_${Date.now().toString(36)}`,
      kind: 'decision' as const,
      author: 'System',
      at: nowIso(),
      text: `Auto-escalated: ${reason}`,
    }
    set((s) => ({
      rfis: s.rfis.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Escalated' as RfiStatus,
              assignedTo: nextTarget ?? r.assignedTo,
              thread: [...r.thread, escComment],
            }
          : r,
      ),
      isDirty: true,
    }))
    const updated = get().rfis.find((r) => r.id === id)
    if (projectId && updated) {
      updateWorkspaceRfi(projectId, id, {
        status: 'Escalated',
        assignedTo: nextTarget,
        thread: updated.thread,
      }).catch(() => {})
    }
  },

  saveChanges: () => set({ isDirty: false }),
}))
