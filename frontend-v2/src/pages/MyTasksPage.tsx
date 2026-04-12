import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Clock, Plus, Search, ShieldAlert } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createWorkerTask, fetchWorkerTasks, updateWorkerTask } from '@/api/resources'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useProjectsStore } from '@/store/useProjectsStore'
import { formatDate } from '@/utils/format'

type TaskStatus = 'Not started' | 'In progress' | 'Completed' | 'Blocked'
type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low'
type TaskPhase = 'Foundation' | 'Structure' | 'MEP' | 'Finishing' | 'Execution'

type TaskDoc = { id: string; name: string }

type WorkerTask = {
  id: string
  projectId: string
  title: string
  description: string
  phase: TaskPhase
  location: string
  assignedBy: string
  startAt: string // ISO
  dueAt: string // ISO
  status: TaskStatus
  priority: TaskPriority
  progressPct: number

  requiredMaterials: string[]
  safetyInstructions: string[]
  linkedDocs: TaskDoc[]
  dependencies: string[]
  engineerNotes: string

  blockedReason?: string
  activity: { id: string; at: string; text: string }[]
}

const TASKS_KEY = 'sanrachna_worker_tasks_v1'
const WORKER_LOGS_KEY = 'sanrachna_worker_logs_v1' // shared with worker dashboard quick logs

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function nowIso() {
  return new Date().toISOString()
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

function safeWrite(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function priorityBadge(p: TaskPriority) {
  if (p === 'Critical') return <Badge variant="danger">Critical</Badge>
  if (p === 'High') return <Badge variant="danger">High</Badge>
  if (p === 'Medium') return <Badge variant="warning">Medium</Badge>
  return <Badge variant="muted">Low</Badge>
}

function statusBadge(s: TaskStatus) {
  if (s === 'Completed') return <Badge variant="success">Completed</Badge>
  if (s === 'In progress') return <Badge variant="warning">In progress</Badge>
  if (s === 'Blocked') return <Badge variant="danger">Blocked</Badge>
  return <Badge variant="muted">Not started</Badge>
}

function isOverdue(dueAt: string, status: TaskStatus) {
  if (status === 'Completed') return false
  return new Date(dueAt).getTime() < Date.now()
}

function remainingLabel(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now()
  const mins = Math.round(ms / (60 * 1000))
  const hrs = Math.round(ms / (60 * 60 * 1000))
  if (mins <= 0) return 'Due now'
  if (mins < 60) return `${mins}m left`
  if (hrs < 24) return `${hrs}h left`
  const days = Math.round(ms / (24 * 60 * 60 * 1000))
  return `${days}d left`
}

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.getTime()
}

function withinToday(iso: string) {
  const t = new Date(iso).getTime()
  return t >= startOfDay() && t <= endOfDay()
}

function withinThisWeek(iso: string) {
  const now = new Date()
  const day = now.getDay() // 0..6
  const diffToMon = (day + 6) % 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  const t = new Date(iso).getTime()
  return t >= mon.getTime() && t <= sun.getTime()
}

const PHASES: TaskPhase[] = ['Foundation', 'Structure', 'MEP', 'Finishing', 'Execution']
const STATUSES: TaskStatus[] = ['Not started', 'In progress', 'Completed', 'Blocked']
const PRIOS: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low']

function mapApiToWorkerTask(raw: unknown, projectId: string, idx: number): WorkerTask | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : `wt-${idx}`
  const title =
    typeof o.title === 'string' ? o.title : typeof o.name === 'string' ? o.name : typeof o.task === 'string' ? o.task : null
  if (!title) return null
  const phaseRaw = typeof o.phase === 'string' ? o.phase : ''
  const phase: TaskPhase = PHASES.includes(phaseRaw as TaskPhase) ? (phaseRaw as TaskPhase) : 'Execution'
  const statusRaw = typeof o.status === 'string' ? o.status : ''
  const status: TaskStatus = STATUSES.includes(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : 'Not started'
  const priRaw = typeof o.priority === 'string' ? o.priority : ''
  const priority: TaskPriority = PRIOS.includes(priRaw as TaskPriority) ? (priRaw as TaskPriority) : 'Medium'
  const progressPct = clampPct(typeof o.progressPct === 'number' ? o.progressPct : Number(o.progress_pct ?? 0))
  return {
    id,
    projectId,
    title,
    description: typeof o.description === 'string' ? o.description : '',
    phase,
    location: typeof o.location === 'string' ? o.location : '—',
    assignedBy: typeof o.assignedBy === 'string' ? o.assignedBy : '—',
    startAt: typeof o.startAt === 'string' ? o.startAt : nowIso(),
    dueAt: typeof o.dueAt === 'string' ? o.dueAt : typeof o.due_at === 'string' ? o.due_at : nowIso(),
    status,
    priority,
    progressPct,
    requiredMaterials: [],
    safetyInstructions: [],
    linkedDocs: [],
    dependencies: [],
    engineerNotes: typeof o.engineerNotes === 'string' ? o.engineerNotes : '',
    blockedReason: typeof o.blockedReason === 'string' ? o.blockedReason : undefined,
    activity: [{ id: `${id}_load`, at: nowIso(), text: 'Task loaded from server.' }],
  }
}

export function MyTasksPage() {
  const { role, user } = useAuth()
  const navigate = useNavigate()
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projectsById = useProjectsStore((s) => s.projects)
  const setCurrentProjectId = useProjectsStore((s) => s.setCurrentProjectId)

  const myKey = useMemo(() => {
    const nm = user?.name?.trim()
    if (!nm) return 'Worker'
    return `Worker — ${nm}`
  }, [user?.name])

  const [timeScope, setTimeScope] = useState<'today' | 'week'>('today')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All')

  const storageKey = useMemo(() => `${TASKS_KEY}:${currentProjectId}:${myKey}`, [currentProjectId, myKey])
  const [tasks, setTasks] = useState<WorkerTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)

  // For engineers/owners load all project tasks; for workers filter to their name
  useEffect(() => {
    if (!currentProjectId) {
      setTasks([])
      setTasksError(null)
      setTasksLoading(false)
      return
    }
    let cancelled = false
    setTasksLoading(true)
    setTasksError(null)
    const workerFilter = role === 'worker' ? myKey : undefined
    fetchWorkerTasks(currentProjectId, workerFilter)
      .then((raw) => {
        if (cancelled) return
        const list = Array.isArray(raw) ? raw : []
        const mapped = list
          .map((x, i) => mapApiToWorkerTask(x, currentProjectId, i))
          .filter((x): x is WorkerTask => Boolean(x))
        setTasks(mapped)
      })
      .catch((e) => {
        if (cancelled) return
        setTasksError(e instanceof Error ? e.message : 'Could not load tasks')
        setTasks([])
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false)
      })
    return () => { cancelled = true }
  }, [currentProjectId, myKey, role])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [completePromptOpen, setCompletePromptOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)

  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [tasks, selectedId])

  const scoped = useMemo(() => {
    const scopeFn = timeScope === 'today' ? withinToday : withinThisWeek
    return tasks.filter((t) => scopeFn(t.dueAt))
  }, [tasks, timeScope])

  const filtered = useMemo(() => {
    return scoped
      .filter((t) => (statusFilter === 'All' ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === 'All' ? true : t.priority === priorityFilter))
      .filter((t) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.phase.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [scoped, statusFilter, priorityFilter, search])

  const metrics = useMemo(() => {
    const assignedToday = tasks.filter((t) => withinToday(t.dueAt)).length
    const inProgress = tasks.filter((t) => t.status === 'In progress').length
    const overdue = tasks.filter((t) => isOverdue(t.dueAt, t.status)).length
    const completedToday = tasks.filter((t) => t.status === 'Completed' && withinToday(t.dueAt)).length
    return { assignedToday, inProgress, overdue, completedToday }
  }, [tasks])

  const target = scoped.length
  const completedCount = useMemo(
    () => scoped.filter((t) => t.status === 'Completed').length,
    [scoped],
  )
  const remainingCount = Math.max(0, target - completedCount)
  const targetPct = target ? Math.round((completedCount / target) * 100) : 0

  const blocked = useMemo(() => tasks.filter((t) => t.status === 'Blocked'), [tasks])
  const recent = useMemo(() => {
    const events = tasks.flatMap((t) => t.activity.map((a) => ({ ...a, taskId: t.id, taskTitle: t.title })))
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10)
  }, [tasks])

  // After each local update, sync to the backend
  const syncTask = (task: WorkerTask) => {
    if (!currentProjectId) return
    updateWorkerTask(currentProjectId, task.id, {
      status: task.status,
      progressPct: task.progressPct,
      blockedReason: task.blockedReason ?? null,
      note: task.activity[0]?.text ?? '',
    }).catch(() => {
      // Silently keep local state on API failure
    })
  }

  const persist = (next: WorkerTask[], changedId?: string) => {
    setTasks(next)
    safeWrite(storageKey, next)
    if (changedId) {
      const changed = next.find((t) => t.id === changedId)
      if (changed) syncTask(changed)
    }
  }

  const openDetail = (id: string) => {
    setSelectedId(id)
    setDetailOpen(true)
  }

  const startTask = (id: string) => {
    const next = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: t.status === 'Completed' ? 'Completed' as TaskStatus : 'In progress' as TaskStatus,
            progressPct: Math.max(1, t.progressPct),
            activity: [{ id: `${t.id}_start_${Date.now().toString(36)}`, at: nowIso(), text: 'Started task.' }, ...t.activity],
          }
        : t,
    )
    persist(next, id)
  }

  const markComplete = (id: string) => {
    const next = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: 'Completed' as TaskStatus,
            progressPct: 100,
            activity: [{ id: `${t.id}_done_${Date.now().toString(36)}`, at: nowIso(), text: 'Marked complete.' }, ...t.activity],
          }
        : t,
    )
    persist(next, id)
    setSelectedId(id)
    setCompletePromptOpen(true)
  }

  const updateProgress = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const pct = clampPct(Number(fd.get('pct') ?? selected.progressPct))
    const note = String(fd.get('note') ?? '').trim()
    const photo = String(fd.get('photo') ?? '').trim()
    const actEntry = {
      id: `${selected.id}_upd_${Date.now().toString(36)}`,
      at: nowIso(),
      text: `Progress updated to ${pct}%${note ? ` — ${note}` : ''}${photo ? ` (photo: ${photo})` : ''}`,
    }
    const next = tasks.map((t) =>
      t.id === selected.id
        ? {
            ...t,
            status: t.status === 'Blocked' ? 'Blocked' as TaskStatus : pct >= 100 ? 'Completed' as TaskStatus : pct > 0 ? 'In progress' as TaskStatus : 'Not started' as TaskStatus,
            progressPct: pct,
            activity: [actEntry, ...t.activity],
          }
        : t,
    )
    // Also send note to backend
    if (currentProjectId) {
      updateWorkerTask(currentProjectId, selected.id, {
        progressPct: pct,
        status: next.find(t => t.id === selected.id)?.status,
        note,
      }).catch(() => {})
    }
    persist(next)
    setProgressOpen(false)
    e.currentTarget.reset()
  }

  const markBlocked = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const reason = String(fd.get('reason') ?? '').trim()
    const next = tasks.map((t) =>
      t.id === selected.id
        ? {
            ...t,
            status: 'Blocked' as TaskStatus,
            blockedReason: reason || 'Blocked',
            activity: [{ id: `${t.id}_blk_${Date.now().toString(36)}`, at: nowIso(), text: `Marked blocked — ${reason || 'No reason'}` }, ...t.activity],
          }
        : t,
    )
    persist(next, selected.id)
    setBlockedOpen(false)
    e.currentTarget.reset()
  }

  const addToDailyLog = (taskTitle: string) => {
    const logs = safeRead<any[]>(WORKER_LOGS_KEY, [])
    const entry = {
      id: `wlog_${Date.now().toString(36)}`,
      at: nowIso(),
      tasksCompleted: `Completed: ${taskTitle}`,
      workersPresent: 0,
      issuesFaced: '',
      photoName: null,
    }
    safeWrite(WORKER_LOGS_KEY, [entry, ...logs].slice(0, 30))
  }

  // ─── Assign Task (engineer/owner) ─────────────────────────────────────────
  const isManager = role === 'engineer' || role === 'owner'
  const [createOpen, setCreateOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '', description: '', assignedTo: '', phase: 'Execution' as TaskPhase,
    location: '', priority: 'Medium' as TaskPriority, dueAt: '', engineerNotes: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const submitCreateTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentProjectId) return
    if (!newTask.title.trim()) { setCreateError('Title is required.'); return }
    if (!newTask.dueAt) { setCreateError('Due date is required.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      const raw = await createWorkerTask(currentProjectId, {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: newTask.assignedTo.trim(),
        assignedBy: user?.name ?? 'Engineer',
        phase: newTask.phase,
        location: newTask.location.trim(),
        priority: newTask.priority,
        dueAt: new Date(newTask.dueAt).toISOString(),
        startAt: new Date().toISOString(),
        engineerNotes: newTask.engineerNotes.trim(),
      })
      const mapped = mapApiToWorkerTask(raw, currentProjectId, tasks.length)
      if (mapped) setTasks((prev) => [mapped, ...prev])
      setCreateOpen(false)
      setNewTask({ title: '', description: '', assignedTo: '', phase: 'Execution', location: '', priority: 'Medium', dueAt: '', engineerNotes: '' })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {tasksError ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/40 bg-[color:var(--color-error)]/5 px-4 py-3 text-sm text-[color:var(--color-error)]">
          {tasksError}
        </div>
      ) : null}
      {tasksLoading ? (
        <div className="text-sm text-[color:var(--color-text_secondary)]">Loading your tasks…</div>
      ) : null}

      {/* Header / controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Focus on today — start, update, complete, or mark blocked quickly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-[color:var(--color-text_secondary)]">Project</span>
            <div className="relative">
              <select
                className="appearance-none bg-transparent pr-6 font-semibold text-[color:var(--color-text)] focus:outline-none"
                value={currentProjectId}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                aria-label="Select project"
              >
                {Object.values(projectsById).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-1 shadow-sm">
            <button
              type="button"
              className={`rounded-[var(--radius-xl)] px-3 py-1.5 text-sm font-semibold ${
                timeScope === 'today' ? 'bg-[color:var(--color-nav_active_bg)]' : ''
              }`}
              onClick={() => setTimeScope('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`rounded-[var(--radius-xl)] px-3 py-1.5 text-sm font-semibold ${
                timeScope === 'week' ? 'bg-[color:var(--color-nav_active_bg)]' : ''
              }`}
              onClick={() => setTimeScope('week')}
            >
              This week
            </button>
          </div>

          <Button variant="danger" onClick={() => navigate('/app/emergency')}>
            <AlertTriangle className="size-4" />
            Emergency
          </Button>
          {isManager ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)} disabled={!currentProjectId}>
              <Plus className="size-4" />
              Assign Task
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm">
            <Search className="size-4 text-[color:var(--color-text_muted)]" />
            <input
              className="w-56 bg-transparent text-sm outline-none"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm">
            <span className="text-[color:var(--color-text_secondary)]">Status</span>
            <select
              className="bg-transparent text-sm font-semibold outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
            >
              <option value="All">All</option>
              <option value="Not started">Not started</option>
              <option value="In progress">In progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm">
            <span className="text-[color:var(--color-text_secondary)]">Priority</span>
            <select
              className="bg-transparent text-sm font-semibold outline-none"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'All')}
            >
              <option value="All">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/issues/new')}>
            <ShieldAlert className="size-4" />
            Report issue
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Assigned today</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.assignedToday}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">In progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.inProgress}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.overdue}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Completed today</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.completedToday}</CardContent>
        </Card>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 70% */}
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Large cards — quick actions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openDetail(t.id)}
                  className="w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-4 text-left shadow-sm transition hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="text-base font-semibold text-[color:var(--color-text)]">{t.title}</div>
                      <div className="text-sm text-[color:var(--color-text_secondary)]">
                        {t.phase} · {t.location}
                      </div>
                      <div className="text-xs text-[color:var(--color-text_muted)]">Assigned by {t.assignedBy}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {priorityBadge(t.priority)}
                        {statusBadge(t.status)}
                        {isOverdue(t.dueAt, t.status) ? <Badge variant="danger">Overdue</Badge> : null}
                        <span className="font-mono text-[11px] text-[color:var(--color-text_muted)]">{t.id}</span>
                      </div>
                    </div>

                    <div className="min-w-[220px] space-y-2 sm:text-right">
                      <div className="flex items-center gap-2 text-xs text-[color:var(--color-text_secondary)] sm:justify-end">
                        <CalendarDays className="size-4" />
                        <span>
                          Start {formatDate(t.startAt)} · Due {formatDate(t.dueAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[color:var(--color-text_secondary)] sm:justify-end">
                        <Clock className="size-4" />
                        <span className="font-semibold text-[color:var(--color-text)]">{remainingLabel(t.dueAt)}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-[color:var(--color-text_secondary)] sm:justify-end sm:gap-2">
                          <span>Progress</span>
                          <span className="font-semibold text-[color:var(--color-text)]">{t.progressPct}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-[color:var(--color-info)]"
                            style={{ width: `${t.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        startTask(t.id)
                      }}
                      disabled={t.status !== 'Not started'}
                    >
                      Start task
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedId(t.id)
                        setProgressOpen(true)
                      }}
                      disabled={t.status === 'Completed'}
                    >
                      Update progress
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markComplete(t.id)
                      }}
                      disabled={t.status === 'Completed' || t.status === 'Blocked'}
                    >
                      <CheckCircle2 className="size-4" />
                      Complete
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openDetail(t.id)
                      }}
                    >
                      View details
                    </Button>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent activity</CardTitle>
              <CardDescription>Completed / updated / blocked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.length ? (
                recent.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{e.taskTitle}</div>
                        <div className="mt-0.5 text-xs text-[color:var(--color-text_secondary)]">{e.text}</div>
                      </div>
                      <div className="text-[11px] text-[color:var(--color-text_muted)]">{formatDate(e.at)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[color:var(--color-text_secondary)]">No recent updates yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 30% */}
        <div className="space-y-6 lg:col-span-4">
          {/* Daily/weekly targets panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{timeScope === 'today' ? "Today's target" : "This week's target"}</CardTitle>
              <CardDescription>
                {completedCount} completed · {remainingCount} remaining
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-[color:var(--color-success)]"
                  style={{ width: `${Math.max(0, Math.min(100, targetPct))}%` }}
                />
              </div>
              <div className="text-xs text-[color:var(--color-text_secondary)]">
                Keep updates small and frequent — it reduces confusion for supervisors.
              </div>
            </CardContent>
          </Card>

          {/* Blocked / at risk */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Blocked / at risk</CardTitle>
              <CardDescription>Surface blockers early</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {blocked.length ? (
                blocked.map((t) => (
                  <div key={t.id} className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-red-900">{t.title}</div>
                        <div className="mt-0.5 text-xs text-red-800">{t.blockedReason ?? 'Blocked'}</div>
                      </div>
                      <Button variant="secondary" onClick={() => openDetail(t.id)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[color:var(--color-text_secondary)]">No blocked tasks.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task detail drawer/modal */}
      <Modal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selected ? `${selected.title}` : 'Task details'}
        description={selected ? `${selected.phase} · ${selected.location}` : undefined}
        className="max-w-3xl"
        footer={
          selected ? (
            <>
              <Button variant="secondary" onClick={() => startTask(selected.id)} disabled={selected.status !== 'Not started'}>
                Start
              </Button>
              <Button variant="secondary" onClick={() => setProgressOpen(true)} disabled={selected.status === 'Completed'}>
                Update progress
              </Button>
              <Button onClick={() => markComplete(selected.id)} disabled={selected.status === 'Completed' || selected.status === 'Blocked'}>
                <CheckCircle2 className="size-4" />
                Complete
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {priorityBadge(selected.priority)}
              {statusBadge(selected.status)}
              <Badge variant="muted">{selected.phase}</Badge>
              <span className="font-mono text-xs text-[color:var(--color-text_muted)]">{selected.id}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Timeline</div>
                <div className="mt-1 text-sm">
                  Start <span className="font-semibold">{formatDate(selected.startAt)}</span>
                </div>
                <div className="mt-1 text-sm">
                  Due <span className="font-semibold">{formatDate(selected.dueAt)}</span> ·{' '}
                  <span className="font-semibold">{remainingLabel(selected.dueAt)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Assigned by</div>
                <div className="mt-1 text-sm font-semibold">{selected.assignedBy}</div>
                <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{selected.location}</div>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--color-border)] p-3">
              <div className="text-xs font-semibold">Description</div>
              <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">{selected.description}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs font-semibold">Required materials</div>
                <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.requiredMaterials.map((m) => (
                    <li key={m}>- {m}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs font-semibold">Safety instructions</div>
                <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.safetyInstructions.map((m) => (
                    <li key={m}>- {m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs font-semibold">Linked documents / drawings</div>
                <div className="mt-2 space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.linkedDocs.length ? selected.linkedDocs.map((d) => <div key={d.id}>{d.name}</div>) : <div>—</div>}
                </div>
              </div>
              <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="text-xs font-semibold">Dependencies / prerequisites</div>
                <div className="mt-2 space-y-1 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.dependencies.length ? selected.dependencies.map((d) => <div key={d}>{d}</div>) : <div>—</div>}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--color-border)] p-3">
              <div className="text-xs font-semibold">Notes from engineer</div>
              <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">{selected.engineerNotes}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setProgressOpen(true)} disabled={selected.status === 'Completed'}>
                Update completion %
              </Button>
              <Button
                variant="danger"
                onClick={() => setBlockedOpen(true)}
                disabled={selected.status === 'Completed'}
              >
                Mark blocked
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[color:var(--color-text_secondary)]">No task selected.</div>
        )}
      </Modal>

      {/* Update progress */}
      <Modal
        open={progressOpen}
        onOpenChange={setProgressOpen}
        title="Update progress"
        description="Upload a photo name and a short note (MVP)."
        footer={
          <Button type="submit" form="task-progress-form">
            Save
          </Button>
        }
      >
        <form id="task-progress-form" className="space-y-4" onSubmit={updateProgress}>
          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="pct">
              Completion %
            </label>
            <Input id="pct" name="pct" type="number" min={0} max={100} defaultValue={selected?.progressPct ?? 25} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="photo">
              Progress photo (name)
            </label>
            <Input id="photo" name="photo" placeholder="optional_photo.jpg" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="note">
              Note
            </label>
            <textarea
              id="note"
              name="note"
              className="mt-1.5 flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
              placeholder="Short update for supervisor…"
            />
          </div>
        </form>
      </Modal>

      {/* Blocked prompt */}
      <Modal
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        title="Mark task blocked"
        description="If blocked, you can report an issue or raise an RFI."
        footer={
          <Button type="submit" form="task-blocked-form" variant="danger">
            Mark blocked
          </Button>
        }
      >
        <form id="task-blocked-form" className="space-y-4" onSubmit={markBlocked}>
          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="reason">
              Reason
            </label>
            <textarea
              id="reason"
              name="reason"
              className="mt-1.5 flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
              placeholder="Awaiting material / unsafe condition / approval pending…"
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/app/issues/new')}>
              <ShieldAlert className="size-4" />
              Report issue
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/app/rfi')}>
              Raise RFI
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete → daily log prompt */}
      <Modal
        open={completePromptOpen}
        onOpenChange={setCompletePromptOpen}
        title="Add to daily log?"
        description="When marking complete, you can add it to your daily log."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompletePromptOpen(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                if (selected) addToDailyLog(selected.title)
                setCompletePromptOpen(false)
              }}
            >
              Add to daily log
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm text-[color:var(--color-text_secondary)]">
          Tip: this helps your supervisor compile the daily log faster.
        </div>
      </Modal>
      {/* Create Task modal (engineer/owner) */}
      {isManager ? (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Assign new task"
          description="Creates a task assigned to a worker. They will see it in My Tasks."
          className="max-w-2xl"
          footer={
            <>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-task-form" disabled={creating}>
                {creating ? 'Creating…' : 'Create Task'}
              </Button>
            </>
          }
        >
          <form id="create-task-form" className="grid gap-3 md:grid-cols-2" onSubmit={submitCreateTask}>
            {createError ? (
              <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
            ) : null}
            <label className="text-sm">
              <div className="mb-1 font-semibold">Title *</div>
              <Input value={newTask.title} onChange={(e) => setNewTask((s) => ({ ...s, title: e.target.value }))} placeholder="Task title" required />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold">Assigned to (worker name)</div>
              <Input value={newTask.assignedTo} onChange={(e) => setNewTask((s) => ({ ...s, assignedTo: e.target.value }))} placeholder="e.g. Worker — yogesh" />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="mb-1 font-semibold">Description</div>
              <textarea
                className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={newTask.description}
                onChange={(e) => setNewTask((s) => ({ ...s, description: e.target.value }))}
                placeholder="What needs to be done?"
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold">Phase</div>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                value={newTask.phase}
                onChange={(e) => setNewTask((s) => ({ ...s, phase: e.target.value as TaskPhase }))}
              >
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold">Priority</div>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                value={newTask.priority}
                onChange={(e) => setNewTask((s) => ({ ...s, priority: e.target.value as TaskPriority }))}
              >
                {PRIOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold">Location</div>
              <Input value={newTask.location} onChange={(e) => setNewTask((s) => ({ ...s, location: e.target.value }))} placeholder="Floor 3, Zone B…" />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-semibold">Due date *</div>
              <Input type="date" value={newTask.dueAt} onChange={(e) => setNewTask((s) => ({ ...s, dueAt: e.target.value }))} required />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="mb-1 font-semibold">Engineer notes (visible to worker)</div>
              <textarea
                className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={newTask.engineerNotes}
                onChange={(e) => setNewTask((s) => ({ ...s, engineerNotes: e.target.value }))}
                placeholder="Safety instructions, materials needed, special notes…"
              />
            </label>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

