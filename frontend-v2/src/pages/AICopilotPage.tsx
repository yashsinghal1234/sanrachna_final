import {
  Loader2,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Mic,
  Copy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
import { isBackendConfigured, apiFetch } from '@/api/http'
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

// ─── globals ──────────────────────────────────────────────────────────────────
const threadsCache: Record<string, LocalThread[]> = {}

// ─── component ────────────────────────────────────────────────────────────────

const StreamingText = ({ content, isRecent }: { content: string, isRecent: boolean }) => {
  const [displayed, setDisplayed] = useState(isRecent ? '' : content)
  
  useEffect(() => {
    if (!isRecent) return
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(content.slice(0, i))
      i += 3
      if (i > content.length) {
        setDisplayed(content)
        clearInterval(interval)
      }
    }, 15)
    return () => clearInterval(interval)
  }, [content, isRecent])

  const textWithCursor = displayed + (displayed.length < content.length ? ' ▋' : '')

  return (
    <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-bold [&_h3]:mt-4 [&_strong]:font-semibold [&_p]:min-h-[1em] [&_table]:w-full [&_table]:my-3 [&_th]:border [&_th]:border-[color:var(--color-border)] [&_th]:px-3 [&_th]:py-2 [&_th]:bg-black/10 [&_th]:dark:bg-white/10 [&_td]:border [&_td]:border-[color:var(--color-border)] [&_td]:px-3 [&_td]:py-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{textWithCursor}</ReactMarkdown>
    </div>
  )
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

  // ── local thread state ────────────────────────────────────────────────────
  const [threads, setThreads] = useState<LocalThread[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [searchQ, setSearchQ] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)          // waiting for Gemini
  const [streamText, setStreamText] = useState('')
  // sources sidebar removed
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [chatLanguage, setChatLanguage] = useState('English')
  const [readingMessageId, setReadingMessageId] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement | null>(null)
  const lastUrlPromptRef = useRef<string>('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const activeThread = threads[activeIdx] ?? null

  const sendRef = useRef<(textArg?: string) => Promise<void>>(async () => {})

  // ── load threads from backend ─────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    if (!currentProjectId || !isBackendConfigured()) return
    
    if (threadsCache[currentProjectId]) {
      setThreads(threadsCache[currentProjectId])
      setActiveIdx(0)
      return
    }

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

  useEffect(() => {
    if (currentProjectId && threads.length > 0) {
      threadsCache[currentProjectId] = threads
    }
  }, [threads, currentProjectId])

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

    setDraft('')
  }

  // ── recording ─────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        
        if (audioBlob.size === 0) {
          setDraft('Error: No audio recorded')
          return
        }

        setDraft('Transcribing voice...')

        const formData = new FormData()
        formData.append('audio', audioBlob, 'voice.webm')

        try {
          const res = await apiFetch(`/api/projects/${currentProjectId}/copilot/transcribe`, {
            method: 'POST',
            body: formData
          })
          if (res.ok) {
            const data = await res.json()
            const text = data.text || ''
            if (text) {
              setDraft(text)
              void sendRef.current(text)
            } else {
              setDraft('Could not hear anything, please try again.')
            }
          } else {
            const err = await res.text()
            setDraft(`Error: ${res.status} ${err}`)
          }
        } catch (err) {
          setDraft(`Network error during transcription.`)
        }
      }

      setRecordingTime(0)
      mediaRecorder.start()
      setIsRecording(true)
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {
      console.error('Mic error:', err)
      alert('Could not access microphone.')
    }
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
  async function send(textArg?: string) {
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
        const { message: reply } = await apiSendMessage(currentProjectId, thread.backendId, text, chatLanguage)
        const assistantMsg: LocalMessage = {
          id: reply.id || uid('m'),
          role: 'assistant',
          content: reply.content,
          createdAt: Date.now(),
          usedModules: reply.usedModules ?? [],
          sources: (reply.usedModules ?? []).map(moduleToSource),
          followUps: reply.followUps ?? [],
        }

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
      console.error(err)
      setDraft(text)
    } finally {
      setSending(false)
      setStreamText('')
    }
  }

  useEffect(() => {
    sendRef.current = send
  }, [draft, sending, activeThread, currentProjectId, threads])

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

                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-all duration-200 border-l-2',
                        active ? 'border-[color:var(--color-primary)] bg-gradient-to-r from-[color:var(--color-primary)]/10 to-transparent' : 'border-transparent hover:bg-[color:var(--color-bg)]',
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

      {/* Main chat area */}
      <div className="grid gap-4">
        <Card className="flex h-[calc(100vh-130px)] flex-col overflow-hidden">
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
                    <Sparkles className="size-3" /> Groq AI
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
          <CardContent className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {activeThread?.messages.map((m) => {
                const isUser = m.role === 'user'
                return (
                  <div key={m.id} className={cn('flex animate-in fade-in slide-in-from-bottom-2 duration-500', isUser ? 'justify-end' : 'justify-start')}>
                    {!isUser && (
                      <div className="mr-4 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                        <Sparkles className="size-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[min(90%,720px)] text-[15px] leading-relaxed',
                        isUser
                          ? 'rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-5 py-3.5 text-white shadow-md'
                          : 'text-[color:var(--color-text)] pt-1'
                      )}
                    >
                      {isUser ? (
                        <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-bold [&_h3]:mt-4 [&_strong]:font-semibold [&_p]:min-h-[1em] [&_table]:w-full [&_table]:my-3 [&_th]:border [&_th]:border-white/20 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-black/20 [&_td]:border [&_td]:border-white/20 [&_td]:px-3 [&_td]:py-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="group relative flex flex-col">
                          <StreamingText 
                            content={m.content.replace(/(\n\s*)?\*?\*?Sources?( used)?(:|-)\*?\*?[\s\S]*$/i, '').trim()} 
                            isRecent={Date.now() - m.createdAt < 5000} 
                          />
                          <div className="mt-2 flex items-center gap-2 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(m.content)
                              }}
                            >
                              <Copy className="mr-0.5 size-3" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                if (readingMessageId === m.id) {
                                  window.speechSynthesis.cancel()
                                  setReadingMessageId(null)
                                } else {
                                  window.speechSynthesis.cancel()
                                  const utterance = new SpeechSynthesisUtterance(m.content.replace(/[*#]/g, ''))
                                  switch(chatLanguage) {
                                    case 'Hindi': utterance.lang = 'hi-IN'; break;
                                    case 'Marathi': utterance.lang = 'mr-IN'; break;
                                    case 'Gujarati': utterance.lang = 'gu-IN'; break;
                                    case 'Bengali': utterance.lang = 'bn-IN'; break;
                                    case 'Tamil': utterance.lang = 'ta-IN'; break;
                                    case 'Telugu': utterance.lang = 'te-IN'; break;
                                    default: utterance.lang = 'en-US'; break;
                                  }
                                  utterance.onend = () => setReadingMessageId(null)
                                  setReadingMessageId(m.id)
                                  window.speechSynthesis.speak(utterance)
                                }
                              }}
                            >
                              {readingMessageId === m.id ? (
                                <>
                                  <VolumeX className="mr-0.5 size-3" /> Stop
                                </>
                              ) : (
                                <>
                                  <Volume2 className="mr-0.5 size-3" /> Read Aloud
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {sending ? (
                <div className="flex justify-start">
                  <div className="mr-4 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_12px_rgba(99,102,241,0.4)] animate-pulse">
                    <Sparkles className="size-4 text-white" />
                  </div>
                  <div className="flex items-center gap-3 pt-2 text-sm text-[color:var(--color-text_secondary)]">
                    <div className="flex gap-1">
                      <div className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-primary)] [animation-delay:-0.3s]" />
                      <div className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-primary)] [animation-delay:-0.15s]" />
                      <div className="size-1.5 animate-bounce rounded-full bg-[color:var(--color-primary)]" />
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </CardContent>

          {/* Input area */}
          <div className="p-4 pt-0">
            <form
              className="relative mx-auto flex w-full max-w-3xl items-center"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              {isRecording ? (
                <div className="min-h-[56px] w-full flex items-center justify-between rounded-[28px] border border-red-500/30 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-xl pl-6 pr-16 py-4 text-[15px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="size-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <span className="text-red-500 font-medium">Recording audio...</span>
                  </div>
                  <div className="text-red-500/80 font-mono pr-[42px]">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              ) : (
                <Input
                  className="min-h-[56px] w-full rounded-[28px] border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl pl-6 pr-28 py-4 text-[15px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] focus-visible:ring-2 focus-visible:ring-indigo-400 transition-all"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message Copilot..."
                  disabled={sending}
                />
              )}
              <Button 
                type="button" 
                size="icon"
                onClick={handleRecord}
                disabled={sending} 
                className={cn(
                  "absolute right-[52px] top-1/2 -translate-y-1/2 h-[42px] w-[42px] rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-[color:var(--color-text_secondary)] transition-all",
                  isRecording && "animate-pulse text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20"
                )}
                variant="ghost"
              >
                <Mic className="size-4" />
              </Button>
              <Button 
                type="submit" 
                size="icon"
                disabled={sending || (!draft.trim() && !isRecording)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 h-[42px] w-[42px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:hover:scale-100 border-none"
              >
                {sending ? <Loader2 className="size-4 animate-spin text-white" /> : <Send className="size-4 ml-0.5 text-white" />}
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-[color:var(--color-text_secondary)]">
              Copilot can make mistakes. Check important info.
            </p>
          </div>
        </Card>


      </div>

      {/* Settings modal */}
      <Modal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Chat Settings"
        description="Update chat title and preferred language."
        footer={
          <Button onClick={() => void onRename()} disabled={!renameValue.trim()}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chat Title</label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="e.g., Cement + procurement" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Language</label>
            <select
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value)}
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-[color:var(--color-bg)] placeholder:text-[color:var(--color-text_muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
            >
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="English">English</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Hindi">Hindi</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Marathi">Marathi</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Gujarati">Gujarati</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Bengali">Bengali</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Tamil">Tamil</option>
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="Telugu">Telugu</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
