import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CopilotRole = 'owner' | 'engineer' | 'worker'

export type CopilotModule =
  | 'Timeline'
  | 'Cost & Resources'
  | 'BOM'
  | 'Procurement'
  | 'RFI'
  | 'Issues'
  | 'Daily Logs'
  | 'Documents'
  | 'Contacts'
  | 'Project'

export type CopilotSource = {
  id: string
  label: string
  module: CopilotModule
  to?: string
}

export type CopilotMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  usedModules?: CopilotModule[]
  sources?: CopilotSource[]
  followUps?: string[]
}

export type CopilotSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pinned: boolean
  archived: boolean
  messages: CopilotMessage[]
}

export type CopilotWorkspaceKey = string // `${projectId}|${userId}|${role}`

export type CopilotWorkspace = {
  key: CopilotWorkspaceKey
  activeSessionId: string | null
  sessions: CopilotSession[]
}

function now() {
  return Date.now()
}

function uid(prefix = 'c') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
}

function defaultWelcome(role: CopilotRole, projectName?: string): CopilotMessage {
  const common =
    'Ask natural-language questions like “Which tasks are delayed?” or “What issues are unresolved?”. I will cite what I used and respect your role permissions.'
  const roleLine =
    role === 'worker'
      ? 'As a worker, I only show your assigned tasks and your own submissions.'
      : role === 'owner'
        ? 'As an owner, you can ask about financials, risks, and progress.'
        : 'As an engineer, you can ask about operational details across modules.'

  const banner = projectName ? `Project context: ${projectName}.` : 'Project context is active.'
  return {
    id: uid('m'),
    role: 'assistant',
    content: `${banner}\n\n${roleLine}\n\n${common}`,
    createdAt: now(),
    usedModules: ['Project'],
    sources: [{ id: uid('s'), label: 'Project workspace index', module: 'Project', to: '/app' }],
    followUps: ['Which tasks are delayed?', 'Show open RFIs', 'Show unresolved issues'],
  }
}

function newSession(role: CopilotRole, projectName?: string): CopilotSession {
  const welcome = defaultWelcome(role, projectName)
  return {
    id: uid('sess'),
    title: 'New chat',
    createdAt: now(),
    updatedAt: now(),
    pinned: false,
    archived: false,
    messages: [welcome],
  }
}

export type CopilotState = {
  workspaces: Record<CopilotWorkspaceKey, CopilotWorkspace>

  ensureWorkspace: (key: CopilotWorkspaceKey, role: CopilotRole, projectName?: string) => void
  setActiveSession: (key: CopilotWorkspaceKey, sessionId: string) => void
  createSession: (key: CopilotWorkspaceKey, role: CopilotRole, projectName?: string) => string
  renameSession: (key: CopilotWorkspaceKey, sessionId: string, title: string) => void
  togglePin: (key: CopilotWorkspaceKey, sessionId: string) => void
  archiveSession: (key: CopilotWorkspaceKey, sessionId: string) => void
  deleteSession: (key: CopilotWorkspaceKey, sessionId: string) => void
  addMessage: (key: CopilotWorkspaceKey, sessionId: string, msg: CopilotMessage) => void
  clearAllForKey: (key: CopilotWorkspaceKey) => void
}

export const useCopilotStore = create<CopilotState>()(
  persist(
    (set) => ({
      workspaces: {},

      ensureWorkspace: (key, role, projectName) =>
        set((s) => {
          if (s.workspaces[key]) return s
          const first = newSession(role, projectName)
          const ws: CopilotWorkspace = { key, activeSessionId: first.id, sessions: [first] }
          return { ...s, workspaces: { ...s.workspaces, [key]: ws } }
        }),

      setActiveSession: (key, sessionId) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          if (!ws.sessions.some((x) => x.id === sessionId)) return s
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, activeSessionId: sessionId } } }
        }),

      createSession: (key, role, projectName) => {
        const id = uid('sess')
        const sess = newSession(role, projectName)
        sess.id = id
        set((s) => {
          const ws = s.workspaces[key] ?? { key, activeSessionId: null, sessions: [] }
          const nextWs: CopilotWorkspace = {
            ...ws,
            activeSessionId: id,
            sessions: [sess, ...ws.sessions],
          }
          return { ...s, workspaces: { ...s.workspaces, [key]: nextWs } }
        })
        return id
      },

      renameSession: (key, sessionId, title) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          const next = ws.sessions.map((x) => (x.id === sessionId ? { ...x, title: title.trim() || x.title } : x))
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, sessions: next } } }
        }),

      togglePin: (key, sessionId) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          const next = ws.sessions.map((x) => (x.id === sessionId ? { ...x, pinned: !x.pinned } : x))
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, sessions: next } } }
        }),

      archiveSession: (key, sessionId) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          const next = ws.sessions.map((x) => (x.id === sessionId ? { ...x, archived: true } : x))
          const activeSessionId =
            ws.activeSessionId === sessionId
              ? next.find((x) => !x.archived)?.id ?? null
              : ws.activeSessionId
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, sessions: next, activeSessionId } } }
        }),

      deleteSession: (key, sessionId) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          const next = ws.sessions.filter((x) => x.id !== sessionId)
          const activeSessionId =
            ws.activeSessionId === sessionId ? next.find((x) => !x.archived)?.id ?? null : ws.activeSessionId
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, sessions: next, activeSessionId } } }
        }),

      addMessage: (key, sessionId, msg) =>
        set((s) => {
          const ws = s.workspaces[key]
          if (!ws) return s
          const nextSessions = ws.sessions.map((x) =>
            x.id === sessionId
              ? { ...x, updatedAt: now(), messages: [...x.messages, msg], title: x.title === 'New chat' && msg.role === 'user' ? msg.content.slice(0, 48) : x.title }
              : x,
          )
          return { ...s, workspaces: { ...s.workspaces, [key]: { ...ws, sessions: nextSessions } } }
        }),

      clearAllForKey: (key) =>
        set((s) => {
          const next = { ...s.workspaces }
          delete next[key]
          return { ...s, workspaces: next }
        }),
    }),
    {
      name: 'sanrachna_copilot_v2',
      version: 2,
      partialize: (s) => ({ workspaces: s.workspaces }),
    },
  ),
)

