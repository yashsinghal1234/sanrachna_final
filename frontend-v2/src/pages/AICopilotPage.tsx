import {
  Archive,
  ChevronRight,
  FileText,
  Loader2,
  PanelRight,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import {
  apiCreateThread,
  apiDeleteThread,
  apiListThreads,
  apiRenameThread,
  apiSendMessage,
  type BackendThread,
} from '@/api/copilotApi'
import { isBackendConfigured } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { CopilotModule, CopilotSource } from '@/store/useCopilotStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import { cn } from '@/utils/cn'

// ─── types ────────────────────────────────────────────────────────────────────

type CopilotRole = 'owner' | 'engineer' | 'worker'

type LocalMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  usedModules?: string[]
  sources?: CopilotSource[]
  followUps?: string[]
}

type LocalThread = {
  backendId: string | null      // MongoDB _id if synced
  title: string
  messages: LocalMessage[]
  pinned: boolean
  archived: boolean
  updatedAt: number
}

function uid(prefix = 'm') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
}

function moduleToSource(m: string): CopilotSource {
  const routes: Record<string, string> = {
    Timeline: '/app/timeline',
    Issues: '/app/issues',
    RFI: '/app/rfi',
    'Daily Logs': '/app/logs',
    'Cost & Resources': '/app/cost-resources',
    Procurement: '/app/procurement',
    Documents: '/app/documents',
    Project: '/app',
  }
  return { id: uid('s'), label: m, module: m as CopilotModule, to: routes[m] }
}

function backendThreadToLocal(t: BackendThread): LocalThread {
  return {
    backendId: t.id,
    title: t.title,
    updatedAt: new Date(t.updatedAt).getTime(),
    pinned: false,
    archived: false,
    messages: t.messages.map((m) => ({
      id: m.id || uid('m'),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
      usedModules: m.usedModules,
      sources: (m.usedModules ?? []).map(moduleToSource),
      followUps: m.followUps,
    })),
  }
}

function defaultWelcome(projectName: string, role: CopilotRole): LocalMessage {
  const roleLine =
    role === 'worker'
      ? 'As a worker, you can ask about your assigned tasks and your own submissions.'
      : role === 'owner'
        ? 'As an owner, you can ask about financials, risks, and project progress.'
        : 'As an engineer, you can ask about operational details across modules.'

  return {
    id: uid('m'),
    role: 'assistant',
    content: `Project context: **${projectName}**.\n\n${roleLine}\n\nAsk natural-language questions like "Which tasks are delayed?" or "What issues are unresolved?". I will cite what I used and respect your role permissions.`,
    createdAt: Date.now(),
    usedModules: ['Project'],
    sources: [{ id: uid('s'), label: 'Project workspace index', module: 'Project', to: '/app' }],
    followUps: ['Which tasks are delayed?', 'Show open RFIs', 'Show unresolved issues'],
  }
}

// ─── component ────────────────────────────────────────────────────────────────

export function AICopilotPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user } = useAuth()

  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const getCurrentProject = useProjectsStore((s) => s.getCurrentProject)
  const project = getCurrentProject()
  const projectName = project?.name ?? 'Project'
  const resolvedRole = (role ?? 'engineer') as CopilotRole

  // ── local thread state ────────────────────────────────────────────────────
  const [threads, setThreads] = useState<LocalThread[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [searchQ, setSearchQ] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)          // waiting for Gemini
  const [streamText, setStreamText] = useState('')
  const [rightOpen, setRightOpen] = useState(true)
  const [activeSources, setActiveSources] = useState<CopilotSource[]>([])
  const [activeUsedModules, setActiveUsedModules] = useState<string[]>([])
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(false)

  const endRef = useRef<HTMLDivElement | null>(null)
  const lastUrlPromptRef = useRef<string>('')

  const activeThread = threads[activeIdx] ?? null

  // ── load threads from backend ─────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    if (!currentProjectId || !isBackendConfigured()) return
    setLoadingThreads(true)
    try {
      const backendThreads = await apiListThreads(currentProjectId)
      if (backendThreads.length) {
        const local = backendThreads.map(backendThreadToLocal)
        setThreads(local)
        setActiveIdx(0)
      } else {
        // No threads yet — start with a fresh one (will be created on first send)
        setThreads([{
          backendId: null,
          title: 'New chat',
          messages: [defaultWelcome(projectName, resolvedRole)],
          pinned: false,
          archived: false,
          updatedAt: Date.now(),
        }])
        setActiveIdx(0)
      }
    } catch {
      // Fallback: local-only welcome
      setThreads([{
        backendId: null,
        title: 'New chat',
        messages: [defaultWelcome(projectName, resolvedRole)],
        pinned: false,
        archived: false,
        updatedAt: Date.now(),
      }])
    } finally {
      setLoadingThreads(false)
    }
  }, [currentProjectId, projectName, resolvedRole])

  useEffect(() => {
    void loadThreads()
  }, [loadThreads])

  // ── new chat ──────────────────────────────────────────────────────────────
  const startNewChat = () => {
    const fresh: LocalThread = {
      backendId: null,
      title: 'New chat',
      messages: [defaultWelcome(projectName, resolvedRole)],
      pinned: false,
      archived: false,
      updatedAt: Date.now(),
    }
    setThreads((prev) => [fresh, ...prev])
    setActiveIdx(0)
    setActiveSources([])
    setActiveUsedModules([])
    setDraft('')
  }

  // ── suggested prompts ─────────────────────────────────────────────────────
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

  // ── send message ──────────────────────────────────────────────────────────
  const send = async (textArg?: string) => {
    const text = (textArg ?? draft).trim()
    if (!text || sending) return
    setDraft('')

    // Add user message locally immediately
    const userMsg: LocalMessage = { id: uid('m'), role: 'user', content: text, createdAt: Date.now() }
    setThreads((prev) => {
      const next = [...prev]
      const t = { ...next[activeIdx]!, messages: [...next[activeIdx]!.messages, userMsg] }
      next[activeIdx] = t
      return next
    })

    setSending(true)
    setStreamText('…')

    try {
      let thread = activeThread

      // Ensure a backend thread exists (lazy creation)
      if (!thread?.backendId && currentProjectId && isBackendConfigured()) {
        const created = await apiCreateThread(currentProjectId, text.slice(0, 60))
        setThreads((prev) => {
          const next = [...prev]
          next[activeIdx] = { ...next[activeIdx]!, backendId: created.id, title: created.title }
          return next
        })
        thread = { ...thread!, backendId: created.id }
      }

      if (thread?.backendId && currentProjectId && isBackendConfigured()) {
        // Call backend → Gemini
        const { message: reply } = await apiSendMessage(currentProjectId, thread.backendId, text)
        const assistantMsg: LocalMessage = {
          id: reply.id || uid('m'),
          role: 'assistant',
          content: reply.content,
          createdAt: Date.now(),
          usedModules: reply.usedModules ?? [],
          sources: (reply.usedModules ?? []).map(moduleToSource),
          followUps: reply.followUps ?? [],
        }
        setActiveSources(assistantMsg.sources ?? [])
        setActiveUsedModules(assistantMsg.usedModules ?? [])
        setThreads((prev) => {
          const next = [...prev]
          const t = { ...next[activeIdx]!, messages: [...next[activeIdx]!.messages, assistantMsg], updatedAt: Date.now() }
          if (t.title === 'New chat') t.title = text.slice(0, 48)
          next[activeIdx] = t
          return next
        })
      } else {
        // Offline fallback
        const fallback: LocalMessage = {
          id: uid('m'),
          role: 'assistant',
          content: 'Backend is not connected. Please configure the server and refresh.',
          createdAt: Date.now(),
          usedModules: ['Project'],
          sources: [],
          followUps: [],
        }
        setThreads((prev) => {
          const next = [...prev]
          next[activeIdx] = { ...next[activeIdx]!, messages: [...next[activeIdx]!.messages, fallback] }
          return next
        })
      }
    } catch (err: unknown) {
      const errMsg: LocalMessage = {
        id: uid('m'),
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Request failed. Please try again.'}`,
        createdAt: Date.now(),
        usedModules: [],
        sources: [],
        followUps: suggestedPrompts.slice(0, 2),
      }
      setThreads((prev) => {
        const next = [...prev]
        next[activeIdx] = { ...next[activeIdx]!, messages: [...next[activeIdx]!.messages, errMsg] }
        return next
      })
    } finally {
      setSending(false)
      setStreamText('')
    }
  }

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages, streamText])

  // ── URL ?prompt= deep‑link ────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const prompt = params.get('prompt')?.trim()
    if (!prompt || sending) return
    if (lastUrlPromptRef.current === prompt) return
    lastUrlPromptRef.current = prompt
    void send(prompt)
    navigate('/app/chatbot', { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // ── rename ────────────────────────────────────────────────────────────────
  const onRename = async () => {
    if (!renameValue.trim()) return
    setThreads((prev) => {
      const next = [...prev]
      next[activeIdx] = { ...next[activeIdx]!, title: renameValue.trim() }
      return next
    })
    const t = threads[activeIdx]
    if (t?.backendId && currentProjectId && isBackendConfigured()) {
      await apiRenameThread(currentProjectId, t.backendId, renameValue.trim()).catch(() => {})
    }
    setRenameOpen(false)
  }

  // ── delete ────────────────────────────────────────────────────────────────
  const deleteThread = async (idx: number) => {
    const t = threads[idx]
    if (t?.backendId && currentProjectId && isBackendConfigured()) {
      await apiDeleteThread(currentProjectId, t.backendId).catch(() => {})
    }
    setThreads((prev) => prev.filter((_, i) => i !== idx))
    setActiveIdx(0)
  }

  // ── visible threads ───────────────────────────────────────────────────────
  const visibleThreads = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return threads
      .map((t, i) => ({ ...t, idx: i }))
      .filter((t) => !t.archived)
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      })
  }, [threads, searchQ])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
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
                  {projectName} · {user?.emailOrPhone ?? 'user'}
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
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-[color:var(--color-text_secondary)]">
                <Loader2 className="size-4 animate-spin" /> Loading chats…
              </div>
            ) : visibleThreads.length ? (
              <div className="divide-y divide-[color:var(--color-border)]">
                {visibleThreads.map((t) => {
                  const active = t.idx === activeIdx
                  return (
                    <button
                      key={t.idx}
                      type="button"
                      onClick={() => {
                        setActiveIdx(t.idx)
                        const last = [...t.messages].reverse().find((m) => m.role === 'assistant')
                        if (last?.sources?.length) {
                          setActiveSources(last.sources)
                          setActiveUsedModules(last.usedModules ?? [])
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
                            {t.pinned ? <Pin className="size-3.5 shrink-0 text-[color:var(--color-warning)]" /> : null}
                            <div className="truncate text-sm font-semibold">{t.title}</div>
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                            {Math.max(0, t.messages.length - 1)} msgs
                            {t.backendId ? (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                ✓ synced
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-[color:var(--color-text_secondary)]">No chats found.</div>
            )}
          </div>
        </div>
      </Card>

      {/* Main chat area + sources panel */}
      <div className={cn('grid gap-4', rightOpen ? 'xl:grid-cols-[1fr_340px]' : 'xl:grid-cols-1')}>
        <Card className="flex min-h-[60vh] flex-col overflow-hidden lg:min-h-[calc(100vh-130px)]">
          {/* Chat header */}
          <div className="border-b border-[color:var(--color-border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{activeThread?.title ?? 'New chat'}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-text_secondary)]">
                  <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-1 font-medium">
                    Project: {projectName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-50 to-blue-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                    <Sparkles className="size-3" /> Gemini 2.0 Flash
                  </span>
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
                    if (!activeThread) return
                    setRenameValue(activeThread.title)
                    setRenameOpen(true)
                  }}
                  aria-label="Rename chat"
                >
                  <Settings className="size-4" />
                </Button>
                {activeThread ? (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        setThreads((prev) => {
                          const next = [...prev]
                          next[activeIdx] = { ...next[activeIdx]!, pinned: !next[activeIdx]!.pinned }
                          return next
                        })
                      }}
                      aria-label="Pin"
                    >
                      <Pin className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        setThreads((prev) => {
                          const next = [...prev]
                          next[activeIdx] = { ...next[activeIdx]!, archived: true }
                          return next
                        })
                        setActiveIdx(0)
                      }}
                      aria-label="Archive"
                    >
                      <Archive className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => void deleteThread(activeIdx)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Messages */}
          <CardContent className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {activeThread?.messages.map((m) => {
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
                      {/* Render markdown-lite: bold, newlines */}
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={i} className="font-semibold text-[color:var(--color-text)]">{part.slice(2, -2)}</strong>
                            : part,
                        )}
                      </div>

                      {!isUser && (m.usedModules?.length || m.sources?.length) ? (
                        <div className="mt-3 space-y-2 border-t border-[color:var(--color-border)] pt-3">
                          {m.usedModules?.length ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-[color:var(--color-text_muted)]">Modules:</span>
                              {m.usedModules.map((x) => (
                                <span key={x} className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-text_secondary)]">
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
                                  disabled={sending}
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

              {sending ? (
                <div className="flex justify-start">
                  <div className="max-w-[min(92%,720px)] rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-text_secondary)] shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-[color:var(--color-primary)]" />
                      <span>Gemini is thinking…</span>
                    </div>
                    <div className="mt-2 h-1 w-24 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </CardContent>

          {/* Input area */}
          <div className="border-t border-[color:var(--color-border)] p-4">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--color-text_secondary)] transition hover:bg-[color:var(--color-bg)]"
                  onClick={() => void send(p)}
                  disabled={sending}
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
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !draft.trim()} className="sm:shrink-0">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </form>
            <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
              Your history is private to this account, role, and current project. Workers only see task-safe answers.
            </p>
          </div>
        </Card>

        {/* Sources panel */}
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
                    <span key={m} className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-text_secondary)]">
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

      {/* Rename modal */}
      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename chat"
        description="Pick a short title so you can find this session later."
        footer={
          <Button onClick={() => void onRename()} disabled={!renameValue.trim()}>
            Save
          </Button>
        }
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="e.g., Cement + procurement" />
      </Modal>
    </div>
  )
}
