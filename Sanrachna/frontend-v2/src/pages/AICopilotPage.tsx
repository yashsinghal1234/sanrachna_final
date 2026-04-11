import {
  Archive,
  ChevronRight,
  FileText,
  PanelRight,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { CopilotModule, CopilotRole, CopilotSource } from '@/store/useCopilotStore'
import { useCopilotStore } from '@/store/useCopilotStore'
import { useIssueStore } from '@/store/useIssueStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useRfiStore } from '@/store/useRfiStore'
import { cn } from '@/utils/cn'

const WORKER_LOGS_KEY = 'sanrachna_worker_logs_v1'
const WORKER_TASKS_KEY = 'sanrachna_worker_tasks_v1'

function uid(prefix = 'm') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function pageContext(pathname: string): { label: string; module: CopilotModule } | null {
  if (pathname.includes('/timeline')) return { label: 'Timeline context active', module: 'Timeline' }
  if (pathname.includes('/cost-resources')) return { label: 'Cost context active', module: 'Cost & Resources' }
  if (pathname.includes('/procurement')) return { label: 'Procurement context active', module: 'Procurement' }
  if (pathname.includes('/rfi')) return { label: 'RFI context active', module: 'RFI' }
  if (pathname.includes('/issues')) return { label: 'Issues context active', module: 'Issues' }
  if (pathname.includes('/logs')) return { label: 'Daily Logs context active', module: 'Daily Logs' }
  if (pathname.includes('/documents')) return { label: 'Documents context active', module: 'Documents' }
  if (pathname.includes('/contacts')) return { label: 'Contacts context active', module: 'Contacts' }
  return null
}

type Answer = {
  text: string
  usedModules: CopilotModule[]
  sources: CopilotSource[]
  followUps: string[]
}

/** Worker: narrow module set. Owner + engineer: full project data (per product spec). */
function redactModulesForRole(role: CopilotRole, wants: CopilotModule[]): CopilotModule[] {
  if (role !== 'worker') return wants
  const allowed: CopilotModule[] = ['Timeline', 'Issues', 'Daily Logs', 'Documents', 'Contacts', 'Project']
  return wants.filter((m) => allowed.includes(m))
}

export function AICopilotPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user } = useAuth()

  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const getCurrentProject = useProjectsStore((s) => s.getCurrentProject)
  const project = getCurrentProject()
  const projectName = project?.name ?? 'Project'
  const resolvedRole = (role ?? 'engineer') as CopilotRole
  const userId = user?.id ?? 'anon'

  const wsKey = `${currentProjectId ?? 'no-project'}|${userId}|${resolvedRole}`

  const ensureWorkspace = useCopilotStore((s) => s.ensureWorkspace)
  const workspaces = useCopilotStore((s) => s.workspaces)
  const ws = workspaces[wsKey]
  const setActiveSession = useCopilotStore((s) => s.setActiveSession)
  const createSession = useCopilotStore((s) => s.createSession)
  const renameSession = useCopilotStore((s) => s.renameSession)
  const togglePin = useCopilotStore((s) => s.togglePin)
  const archiveSession = useCopilotStore((s) => s.archiveSession)
  const deleteSession = useCopilotStore((s) => s.deleteSession)
  const addMessage = useCopilotStore((s) => s.addMessage)

  const issuesByProject = useIssueStore((s) => s.issuesByProject)
  const rfis = useRfiStore((s) => s.rfis)

  const [searchSessions, setSearchSessions] = useState('')
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [rightOpen, setRightOpen] = useState(true)
  const [activeSources, setActiveSources] = useState<CopilotSource[]>([])
  const [activeUsedModules, setActiveUsedModules] = useState<CopilotModule[]>([])
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const lastUrlPromptRef = useRef<string>('')

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ensureWorkspace(wsKey, resolvedRole, projectName)
  }, [ensureWorkspace, wsKey, resolvedRole, projectName])

  useEffect(() => {
    const w = workspaces[wsKey]
    if (!w) return
    const open = w.sessions.filter((s) => !s.archived)
    if (!open.length) {
      const id = createSession(wsKey, resolvedRole, projectName)
      setActiveSession(wsKey, id)
      return
    }
    if (!w.activeSessionId || !open.some((s) => s.id === w.activeSessionId)) {
      setActiveSession(wsKey, open[0].id)
    }
  }, [workspaces, wsKey, createSession, setActiveSession, resolvedRole, projectName])

  const sessions = ws?.sessions ?? []
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === ws?.activeSessionId) ?? null,
    [sessions, ws?.activeSessionId],
  )

  const ctx = useMemo(() => pageContext(location.pathname), [location.pathname])

  const myKey = useMemo(() => {
    const nm = user?.name?.trim()
    if (!nm) return resolvedRole === 'worker' ? 'Worker' : resolvedRole === 'owner' ? 'Owner' : 'Engineer'
    return resolvedRole === 'worker'
      ? `Worker — ${nm}`
      : resolvedRole === 'owner'
        ? `Owner — ${nm}`
        : `Engineer — ${nm}`
  }, [resolvedRole, user?.name])

  const workerTasksKey = useMemo(() => `${WORKER_TASKS_KEY}:${currentProjectId}:${myKey}`, [currentProjectId, myKey])
  const workerLogs = useMemo(() => safeRead<any[]>(WORKER_LOGS_KEY, []), [])
  const workerTasks = useMemo(() => safeRead<any[]>(workerTasksKey, []), [workerTasksKey])

  const projectIssues = issuesByProject[currentProjectId ?? ''] ?? []

  const visibleSessions = useMemo(() => {
    const q = searchSessions.trim().toLowerCase()
    const list = sessions.filter((s) => !s.archived)
    const filtered = q ? list.filter((s) => s.title.toLowerCase().includes(q)) : list
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
  }, [sessions, searchSessions])

  const suggestedPrompts = useMemo(() => {
    if (resolvedRole === 'worker') {
      return [
        'What are my tasks for today?',
        'Which of my tasks are overdue or blocked?',
        'Show my open issues',
        'Summarize my latest daily log',
      ]
    }
    return [
      'Summarize project cost and schedule risk',
      'Which tasks are delayed?',
      'What finishes are driving the critical path?',
      'Who is assigned to slab casting?',
      'What issues are unresolved?',
      'What RFIs are still open?',
    ]
  }, [resolvedRole])

  const answerFor = (prompt: string): Answer => {
    const p = prompt.toLowerCase()
    const sources: CopilotSource[] = []
    const followUps: string[] = []
    let wants: CopilotModule[] = []

    if (resolvedRole === 'worker' && (p.includes('my tasks') || p.includes('tasks for today'))) {
      wants = ['Timeline', 'Project']
      const today = new Date().toISOString().slice(0, 10)
      const dueToday = workerTasks.filter(
        (t) => String(t.dueAt ?? '').slice(0, 10) === today || t.status === 'In progress' || t.status === 'Blocked',
      )
      const list = (dueToday.length ? dueToday : workerTasks).slice(0, 8)
      const lines = list.map((t) => `- ${t.title ?? t.name ?? t.id} (${t.status ?? 'Not started'}) · ${t.location ?? '—'}`)
      sources.push({ id: uid('s'), label: 'My Tasks', module: 'Timeline', to: '/app/my-tasks' })
      followUps.push('Which of these are overdue?', 'Open Submit Log')
      return {
        text: lines.length ? `Here are your current tasks:\n${lines.join('\n')}` : 'I do not see any assigned tasks for you yet.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (resolvedRole === 'worker' && p.includes('my open issues')) {
      wants = ['Issues', 'Project']
      const open = projectIssues.filter((i) => i.reportedBy === myKey).filter((i) => i.status !== 'Closed')
      sources.push({ id: uid('s'), label: 'Report Issue', module: 'Issues', to: '/app/issues/new' })
      followUps.push('Show only critical issues')
      return {
        text: open.length
          ? `You have ${open.length} open issue(s):\n${open
              .slice(0, 8)
              .map((i) => `- ${i.id}: ${i.title} (${i.status}) · ${i.location}`)
              .join('\n')}`
          : 'You have no open issues reported by you.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('cement') || p.includes('how much cement')) {
      wants = ['BOM', 'Cost & Resources', 'Project']
      if (resolvedRole === 'worker') {
        return {
          text: 'I cannot share project-wide material quantities for your role. Ask about **your assigned tasks** or **your submitted issues/logs** instead.',
          usedModules: ['Project'],
          sources: [{ id: uid('s'), label: 'Role permissions', module: 'Project', to: '/app/settings/profile' }],
          followUps: ['What are my tasks for today?', 'Show my open issues'],
        }
      }
      sources.push({ id: uid('s'), label: 'BOM & cost snapshot', module: 'Cost & Resources', to: '/app/cost-resources' })
      followUps.push('Open procurement for material quotes', 'Show BOM from approved plan')
      return {
        text: 'Material quantities are not estimated in the copilot without a live BOM integration. Open **Cost & Resources** for BOM rows from your approved plan or cost-resources API.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('delayed') || p.includes('delay') || p.includes('behind')) {
      wants = ['Timeline', 'Daily Logs', 'Issues']
      const criticalOpen = projectIssues.filter((i) => i.severity === 'Critical' && i.status !== 'Closed').length
      sources.push({ id: uid('s'), label: 'Timeline', module: 'Timeline', to: '/app/timeline' })
      sources.push({ id: uid('s'), label: 'Issues', module: 'Issues', to: resolvedRole === 'worker' ? '/app/issues/new' : '/app/issues' })
      followUps.push('Show unresolved critical issues', 'What RFIs are still open?')
      return {
        text:
          criticalOpen > 0
            ? `There are **${criticalOpen} critical issue(s)** still open — these often block work. Open **Timeline** to see which tasks are behind schedule and cross-check with Issues/Daily Logs.`
            : 'Open **Timeline** to see tasks behind plan. I can dig into a specific phase (Foundation / Structure / MEP / Finishing) if you name it.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('flooring') && p.includes('cost')) {
      wants = ['Cost & Resources', 'Procurement']
      if (resolvedRole === 'worker') {
        return {
          text: 'Project-wide cost estimates are not available for your role.',
          usedModules: ['Project'],
          sources: [{ id: uid('s'), label: 'Role permissions', module: 'Project', to: '/app/settings/profile' }],
          followUps: suggestedPrompts.slice(0, 2),
        }
      }
      sources.push({ id: uid('s'), label: 'Cost & Resources', module: 'Cost & Resources', to: '/app/cost-resources' })
      sources.push({ id: uid('s'), label: 'Procurement', module: 'Procurement', to: '/app/procurement' })
      followUps.push('Compare finish vendors', 'Show finishing phase cost')
      return {
        text: 'Line-item costs are not invented here. Use **Cost & Resources** and **Procurement** for values returned by your workspace APIs.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('rfi') && (p.includes('open') || p.includes('still'))) {
      wants = ['RFI']
      const open = rfis.filter((r) => r.status !== 'Closed' && r.status !== 'Answered')
      sources.push({ id: uid('s'), label: 'RFI Center', module: 'RFI', to: '/app/rfi' })
      followUps.push('Which RFIs are overdue?')
      return {
        text: open.length
          ? `Open RFIs: **${open.length}**\n${open.slice(0, 8).map((r) => `- ${r.id}: ${r.title} (${r.status})`).join('\n')}`
          : 'No open RFIs in the current register.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('unresolved') && p.includes('issue')) {
      wants = ['Issues']
      const unresolved = projectIssues.filter((i) => i.status !== 'Closed')
      sources.push({ id: uid('s'), label: 'Issues', module: 'Issues', to: resolvedRole === 'worker' ? '/app/issues/new' : '/app/issues' })
      followUps.push('Show only critical issues')
      return {
        text: unresolved.length
          ? `Unresolved issues: **${unresolved.length}**\n${unresolved
              .slice(0, 8)
              .map((i) => `- ${i.id}: ${i.title} (${i.status}) · ${i.location}`)
              .join('\n')}`
          : 'No unresolved issues in the current register.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('slab') && p.includes('cast')) {
      wants = ['Timeline', 'Issues']
      if (resolvedRole === 'worker') {
        return {
          text: 'I can only discuss **your** assigned tasks. Try: “What are my tasks for today?”',
          usedModules: ['Project'],
          sources: [{ id: uid('s'), label: 'My Tasks', module: 'Timeline', to: '/app/my-tasks' }],
          followUps: ['What are my tasks for today?'],
        }
      }
      sources.push({ id: uid('s'), label: 'Timeline / assignments', module: 'Timeline', to: '/app/timeline' })
      const assignHint = projectIssues.find((i) => i.title.toLowerCase().includes('slab') || i.description.toLowerCase().includes('slab'))
      followUps.push('Which tasks are delayed?', 'Open Issues for slab-related snags')
      return {
        text: assignHint
          ? `For slab-related work, check **Timeline** for crew assignment. Related issue context: **${assignHint.title}** (see Issues).`
          : 'Slab casting assignment is maintained on the **Timeline** (crew / task owner). Open Timeline for the authoritative assignment view.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps,
      }
    }

    if (p.includes('latest daily log') || p.includes('summarize my latest')) {
      wants = ['Daily Logs']
      if (resolvedRole !== 'worker') {
        sources.push({ id: uid('s'), label: 'Daily Logs', module: 'Daily Logs', to: '/app/logs' })
        return {
          text: 'Open **Daily Logs** for the full project feed, or ask a worker to submit today’s log.',
          usedModules: redactModulesForRole(resolvedRole, wants),
          sources,
          followUps: ['What issues are unresolved?'],
        }
      }
      const mine = workerLogs.filter((l: any) => l?.details?.worker === myKey || String(l?.details?.worker ?? '').includes(myKey))
      const latest = mine[0] ?? workerLogs[0]
      sources.push({ id: uid('s'), label: 'Submit Log', module: 'Daily Logs', to: '/app/logs/new' })
      return {
        text: latest
          ? `Latest log snapshot:\n- **Tasks:** ${latest.tasksCompleted ?? '—'}\n- **Workers:** ${latest.workersPresent ?? '—'}\n- **Notes:** ${latest.issuesFaced ?? '—'}`
          : 'No logs found locally yet. Submit one from **Submit Log**.',
        usedModules: redactModulesForRole(resolvedRole, wants),
        sources,
        followUps: ['Submit a new daily log', 'What are my tasks for today?'],
      }
    }

    wants = ctx ? ['Project', ctx.module] : ['Project']
    return {
      text:
        resolvedRole === 'worker'
          ? 'Ask about **your tasks**, **your issues**, or **your daily logs**. I stay within your role.'
          : 'Ask about timeline, cost, procurement, RFIs, issues, or documents. I will cite the modules I used.',
      usedModules: redactModulesForRole(resolvedRole, wants),
      sources: [{ id: uid('s'), label: 'Project workspace', module: 'Project', to: '/app' }],
      followUps: suggestedPrompts.slice(0, 4),
    }
  }

  const send = async (textArg?: string) => {
    if (!activeSession || !ws) return
    const text = (textArg ?? draft).trim()
    if (!text || streaming) return

    addMessage(wsKey, activeSession.id, { id: uid('m'), role: 'user', content: text, createdAt: Date.now() })
    setDraft('')

    const ans = answerFor(text)
    const assistantId = uid('m')
    setStreaming(true)
    setStreamText('')

    for (let i = 0; i <= ans.text.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => window.setTimeout(r, 4))
      setStreamText(ans.text.slice(0, i))
    }
    await new Promise((r) => window.setTimeout(r, 40))

    setStreaming(false)
    setStreamText('')

    addMessage(wsKey, activeSession.id, {
      id: assistantId,
      role: 'assistant',
      content: ans.text,
      createdAt: Date.now(),
      usedModules: ans.usedModules,
      sources: ans.sources,
      followUps: ans.followUps,
    })

    setActiveUsedModules(ans.usedModules)
    setActiveSources(ans.sources)
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, streamText])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const prompt = params.get('prompt')?.trim()
    if (!prompt || !activeSession || streaming) return
    if (lastUrlPromptRef.current === prompt) return
    lastUrlPromptRef.current = prompt
    void send(prompt)
    navigate('/app/chatbot', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, activeSession?.id])

  const startNewChat = () => {
    const id = createSession(wsKey, resolvedRole, projectName)
    setActiveSession(wsKey, id)
    setActiveSources([])
    setActiveUsedModules([])
  }

  const onRename = () => {
    if (!activeSession) return
    renameSession(wsKey, activeSession.id, renameValue)
    setRenameOpen(false)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="h-[calc(100vh-130px)] overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="border-b border-[color:var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-[color:var(--color-primary_dark)]" />
                  <div className="truncate text-sm font-semibold">AI Copilot</div>
                </div>
                <div className="mt-1 truncate text-xs text-[color:var(--color-text_secondary)]">
                  {projectName} · {user?.emailOrPhone ?? userId}
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--color-text_muted)]">Role: {resolvedRole}</div>
              </div>
              <Button size="icon" variant="secondary" onClick={startNewChat} aria-label="New chat">
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm shadow-sm">
              <Search className="size-4 shrink-0 text-[color:var(--color-text_muted)]" />
              <input
                className="w-full min-w-0 bg-transparent text-sm outline-none"
                placeholder="Search chats…"
                value={searchSessions}
                onChange={(e) => setSearchSessions(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {visibleSessions.length ? (
              <div className="divide-y divide-[color:var(--color-border)]">
                {visibleSessions.map((s) => {
                  const active = s.id === ws?.activeSessionId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSession(wsKey, s.id)
                        const lastAssistant = [...s.messages].reverse().find((m) => m.role === 'assistant')
                        if (lastAssistant?.sources?.length) {
                          setActiveSources(lastAssistant.sources)
                          setActiveUsedModules(lastAssistant.usedModules ?? [])
                        }
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left transition hover:bg-[color:var(--color-bg)]',
                        active ? 'bg-[color:var(--color-bg)]' : '',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {s.pinned ? <Pin className="size-3.5 shrink-0 text-[color:var(--color-warning)]" /> : null}
                            <div className="truncate text-sm font-semibold">{s.title}</div>
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                            {Math.max(0, s.messages.length - 1)} msgs
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-[color:var(--color-text_secondary)]">No chats match your search.</div>
            )}
          </div>
        </div>
      </Card>

      <div className={cn('grid gap-4', rightOpen ? 'xl:grid-cols-[1fr_340px]' : 'xl:grid-cols-1')}>
        <Card className="flex min-h-[60vh] flex-col overflow-hidden lg:min-h-[calc(100vh-130px)]">
          <div className="border-b border-[color:var(--color-border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{activeSession?.title ?? 'Chat'}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-text_secondary)]">
                  <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-1 font-medium">
                    Project: {projectName}
                  </span>
                  {ctx ? (
                    <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-1 font-medium">{ctx.label}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="icon" onClick={() => setRightOpen((v) => !v)} aria-label="Toggle sources">
                  <PanelRight className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    if (!activeSession) return
                    setRenameValue(activeSession.title)
                    setRenameOpen(true)
                  }}
                  aria-label="Rename chat"
                >
                  <Settings className="size-4" />
                </Button>
                {activeSession ? (
                  <>
                    <Button variant="secondary" size="icon" onClick={() => togglePin(wsKey, activeSession.id)} aria-label="Pin">
                      <Pin className="size-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => archiveSession(wsKey, activeSession.id)} aria-label="Archive">
                      <Archive className="size-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => deleteSession(wsKey, activeSession.id)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <CardContent className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {activeSession?.messages.map((m) => {
                const isUser = m.role === 'user'
                return (
                  <div key={m.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[min(92%,720px)] rounded-2xl border px-4 py-3 text-sm shadow-sm',
                        isUser
                          ? 'border-[color:var(--color-nav_active_ring)] bg-[color:var(--color-nav_active_bg)] text-[color:var(--color-text)]'
                          : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-text_secondary)]',
                      )}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                      {!isUser && (m.usedModules?.length || m.sources?.length) ? (
                        <div className="mt-3 space-y-2 border-t border-[color:var(--color-border)] pt-3">
                          {m.usedModules?.length ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-[color:var(--color-text_muted)]">Modules:</span>
                              {m.usedModules.map((x) => (
                                <span
                                  key={x}
                                  className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-text_secondary)]"
                                >
                                  {x}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {m.sources?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {m.sources.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-left text-xs font-semibold text-[color:var(--color-text_secondary)] transition hover:bg-[color:var(--color-bg)]"
                                  onClick={() => {
                                    setActiveSources(m.sources ?? [])
                                    setActiveUsedModules(m.usedModules ?? [])
                                    setRightOpen(true)
                                    if (s.to) navigate(s.to)
                                  }}
                                >
                                  {s.label} · {s.module}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {m.followUps?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {m.followUps.map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  className="rounded-full bg-[color:var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text_secondary)] hover:bg-white"
                                  onClick={() => void send(q)}
                                  disabled={streaming}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {streaming ? (
                <div className="flex justify-start">
                  <div className="max-w-[min(92%,720px)] rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-text_secondary)] shadow-sm">
                    <div className="whitespace-pre-wrap leading-relaxed">{streamText}</div>
                    <div className="mt-2 h-1 w-16 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </CardContent>

          <div className="border-t border-[color:var(--color-border)] p-4">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--color-text_secondary)] transition hover:bg-[color:var(--color-bg)]"
                  onClick={() => void send(p)}
                  disabled={streaming}
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <Input
                className="flex-1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything about this project…"
                disabled={streaming}
              />
              <Button type="submit" disabled={streaming || !draft.trim()} className="sm:shrink-0">
                <Send className="size-4" />
                Send
              </Button>
            </form>
            <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
              Your history is private to this account, role, and current project. Workers only see task-safe answers.
            </p>
          </div>
        </Card>

        {rightOpen ? (
          <Card className="h-auto max-h-[480px] overflow-hidden xl:max-h-[calc(100vh-130px)]">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] p-4">
              <div>
                <div className="text-sm font-semibold">Sources</div>
                <div className="mt-0.5 text-xs text-[color:var(--color-text_secondary)]">Click a chip in a reply to open the page</div>
              </div>
              <Button variant="secondary" size="icon" className="xl:hidden" onClick={() => setRightOpen(false)} aria-label="Close sources">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <CardContent className="max-h-[360px] space-y-3 overflow-auto p-4 xl:max-h-[calc(100vh-200px)]">
              {activeUsedModules.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeUsedModules.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-text_secondary)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}

              {activeSources.length ? (
                activeSources.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-[color:var(--color-border)] bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{s.module}</div>
                      </div>
                      {s.to ? (
                        <Button variant="secondary" className="shrink-0" onClick={() => navigate(s.to!)}>
                          Open
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
                  Ask a question — module sources will appear here after the assistant replies.
                </div>
              )}

              <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-text_secondary)]">
                <div className="flex items-center gap-2 font-semibold text-[color:var(--color-text)]">
                  <FileText className="size-4 shrink-0" />
                  Role-based access
                </div>
                <p className="mt-2">
                  {resolvedRole === 'worker'
                    ? 'Workers: assigned tasks, own logs/issues, and safe summaries only.'
                    : resolvedRole === 'engineer'
                      ? 'Engineers: full operational visibility across modules linked in the app.'
                      : 'Owners: strategic + financial summaries where available in the product.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename chat"
        description="Pick a short title so you can find this session later."
        footer={
          <Button onClick={onRename} disabled={!renameValue.trim()}>
            Save
          </Button>
        }
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="e.g., Cement + procurement" />
      </Modal>
    </div>
  )
}
