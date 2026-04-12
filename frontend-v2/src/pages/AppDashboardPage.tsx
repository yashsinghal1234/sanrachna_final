import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  IndianRupee,
  LineChart as LineIcon,
  ShieldAlert,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { FormEvent } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { fetchDashboardBundle, fetchWorkerTasks } from '@/api/resources'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useIssueStore } from '@/store/useIssueStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useRfiStore } from '@/store/useRfiStore'
import { useApprovedReport } from '@/hooks/useApprovedReport'
import type { CostBreakdown, TimelineTask } from '@/types/dashboard.types'
import { formatDate, formatINR } from '@/utils/format'

type WorkerTaskStatus = 'Not started' | 'In progress' | 'Completed'
type WorkerTaskPriority = 'Critical' | 'High' | 'Medium' | 'Low'
type WorkerTask = {
  id: string
  title: string
  location: string
  priority: WorkerTaskPriority
  startTime: string
  endTime: string
  deadline: string // ISO
  status: WorkerTaskStatus
  progressPct: number
}

type WorkerLog = {
  id: string
  at: string // ISO
  tasksCompleted: string
  workersPresent: number
  issuesFaced: string
  photoName: string | null
}

const WORKER_LOGS_KEY = 'sanrachna_worker_logs_v1'

function safeReadWorkerLogs(): WorkerLog[] {
  try {
    const raw = window.localStorage.getItem(WORKER_LOGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean) as WorkerLog[]
  } catch {
    return []
  }
}

function safeWriteWorkerLogs(logs: WorkerLog[]) {
  try {
    window.localStorage.setItem(WORKER_LOGS_KEY, JSON.stringify(logs))
  } catch {
    // ignore
  }
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function priorityBadge(p: WorkerTaskPriority) {
  if (p === 'Critical') return <Badge variant="danger">Critical</Badge>
  if (p === 'High') return <Badge variant="danger">High</Badge>
  if (p === 'Medium') return <Badge variant="warning">Medium</Badge>
  return <Badge variant="muted">Low</Badge>
}

function statusBadge(s: WorkerTaskStatus) {
  if (s === 'Completed') return <Badge variant="success">Completed</Badge>
  if (s === 'In progress') return <Badge variant="warning">In progress</Badge>
  return <Badge variant="muted">Not started</Badge>
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function mapToWorkerDashTask(raw: unknown, idx: number): WorkerTask | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : `wt-${idx}`
  const title =
    typeof o.title === 'string' ? o.title : typeof o.name === 'string' ? o.name : typeof o.task === 'string' ? o.task : null
  if (!title) return null
  const deadline =
    typeof o.dueAt === 'string' ? o.dueAt : typeof o.due_at === 'string' ? o.due_at : new Date().toISOString()
  const statusRaw = typeof o.status === 'string' ? o.status : ''
  const status: WorkerTaskStatus =
    statusRaw === 'Completed' ? 'Completed' : statusRaw === 'In progress' ? 'In progress' : 'Not started'
  const priorityRaw = typeof o.priority === 'string' ? o.priority : ''
  const priority: WorkerTaskPriority =
    priorityRaw === 'Critical' || priorityRaw === 'High' || priorityRaw === 'Medium' || priorityRaw === 'Low'
      ? priorityRaw
      : 'Medium'
  return {
    id,
    title,
    location: typeof o.location === 'string' ? o.location : '—',
    priority,
    startTime: '—',
    endTime: '—',
    deadline,
    status,
    progressPct: clampPct(typeof o.progressPct === 'number' ? o.progressPct : Number(o.progress_pct ?? 0)),
  }
}

const pieColors = ['#F59E0B', '#3B82F6', '#2FBFAD', '#8B5CF6', '#94A3B8']

function kpiPillColor(kind: 'critical' | 'warning' | 'good') {
  if (kind === 'critical') return 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
  if (kind === 'warning') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75
      ? 'bg-[color:var(--color-success)]'
      : value >= 55
        ? 'bg-[color:var(--color-warning)]'
        : 'bg-[color:var(--color-error)]'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[color:var(--color-text_secondary)]">
        <span>{label}</span>
        <span className="font-semibold text-[color:var(--color-text)]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function AppDashboardPage() {
  const { role, user } = useAuth()
  const navigate = useNavigate()
  const projectsFromStore = useProjectsStore((s) => s.projects)
  const currentProjectIdOwner = useProjectsStore((s) => s.currentProjectId)
  const setCurrentProjectIdOwner = useProjectsStore((s) => s.setCurrentProjectId)

  const projectOptions = useMemo(
    () => Object.values(projectsFromStore).filter((p) => !p.archived),
    [projectsFromStore],
  )

  const [ownerCostBreakdown, setOwnerCostBreakdown] = useState<CostBreakdown | null>(null)
  const [ownerTimelineTasks, setOwnerTimelineTasks] = useState<TimelineTask[]>([])
  const [ownerDashboardLoading, setOwnerDashboardLoading] = useState(false)

  useEffect(() => {
    if (role !== 'owner' || !currentProjectIdOwner) {
      setOwnerCostBreakdown(null)
      setOwnerTimelineTasks([])
      setOwnerDashboardLoading(false)
      return
    }
    let cancelled = false
    setOwnerDashboardLoading(true)
    fetchDashboardBundle(currentProjectIdOwner)
      .then((b) => {
        if (cancelled) return
        setOwnerCostBreakdown(b.cost_breakdown)
        setOwnerTimelineTasks(b.timeline_tasks)
      })
      .catch(() => {
        if (!cancelled) {
          setOwnerCostBreakdown(null)
          setOwnerTimelineTasks([])
        }
      })
      .finally(() => {
        if (!cancelled) setOwnerDashboardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [role, currentProjectIdOwner])



  const ownerLineData = useMemo(() => {
    if (!ownerTimelineTasks.length) return []
    return ownerTimelineTasks.slice(0, 12).map((t, i) => ({
      week: `T${i + 1}`,
      planned: t.pct_complete,
      actual: t.pct_complete,
    }))
  }, [ownerTimelineTasks])

  const activeOwnerProject = currentProjectIdOwner ? projectsFromStore[currentProjectIdOwner] : undefined

  // ── Report-derived data (replaces empty backend ownerCostBreakdown) ───────
  const { cost: reportCost, risks: reportRisks, timeline: reportTimeline,
          workforce: reportWorkforce, estimatedMonths, confidence,
          feasibility, hasReport, isApproved } = useApprovedReport()

  // Pie chart data: prefer report phases, fall back to backend breakdown
  const ownerPieData = useMemo(() => {
    if (reportCost) {
      return reportCost.phases.map((p) => ({ name: p.name, value: p.cost })).filter((x) => x.value > 0)
    }
    const c = ownerCostBreakdown
    if (!c) return [{ name: 'Foundation', value: 0 }]
    return [
      { name: 'Foundation', value: c.foundation_inr },
      { name: 'Structure', value: c.structure_inr },
      { name: 'MEP', value: c.mep_inr },
      { name: 'Finishing', value: c.finishing_inr },
      { name: 'Contingency', value: c.contingency_inr },
    ].filter((x) => x.value > 0)
  }, [reportCost, ownerCostBreakdown])

  const ownerAvgProgress = useMemo(() => {
    if (!ownerTimelineTasks.length) return null
    return Math.round(ownerTimelineTasks.reduce((a, t) => a + t.pct_complete, 0) / ownerTimelineTasks.length)
  }, [ownerTimelineTasks])

  if (role === 'worker') {
    const currentProjectId = useProjectsStore((s) => s.currentProjectId)
    const projectsById = useProjectsStore((s) => s.projects)
    const setCurrentProjectId = useProjectsStore((s) => s.setCurrentProjectId)

    const issuesByProject = useIssueStore((s) => s.issuesByProject)
    const rfis = useRfiStore((s) => s.rfis)

    const myKey = useMemo(() => {
      const nm = user?.name?.trim()
      if (!nm) return null
      return `Worker — ${nm}`
    }, [user?.name])

    const [tasks, setTasks] = useState<WorkerTask[]>([])

    useEffect(() => {
      if (!currentProjectId || !myKey) {
        setTasks([])
        return
      }
      let cancelled = false
      fetchWorkerTasks(currentProjectId, myKey)
        .then((raw) => {
          if (cancelled) return
          const list = Array.isArray(raw) ? raw : []
          setTasks(list.map(mapToWorkerDashTask).filter((x): x is WorkerTask => Boolean(x)))
        })
        .catch(() => {
          if (!cancelled) setTasks([])
        })
      return () => {
        cancelled = true
      }
    }, [currentProjectId, myKey])

    const [progressOpen, setProgressOpen] = useState(false)
    const [logOpen, setLogOpen] = useState(false)
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

    const [workerLogs, setWorkerLogs] = useState<WorkerLog[]>(() => safeReadWorkerLogs())

    const todayLogs = useMemo(() => workerLogs.filter((l) => l.at.slice(0, 10) === todayKey()), [workerLogs])
    const pendingLogs = Math.max(0, 1 - todayLogs.length)

    const myIssuesOpen = useMemo(() => {
      if (!myKey) return 0
      const arr = issuesByProject[currentProjectId] ?? []
      return arr.filter((i) => i.reportedBy === myKey).filter((i) => i.status !== 'Closed').length
    }, [issuesByProject, currentProjectId, myKey])

    const myRfisCount = useMemo(() => {
      if (!myKey) return 0
      return rfis.filter((r) => r.raisedBy === myKey).length
    }, [rfis, myKey])

    const upcomingDeadlines = useMemo(() => {
      const soon = Date.now() + 24 * 60 * 60 * 1000
      return tasks.filter((t) => new Date(t.deadline).getTime() <= soon && t.status !== 'Completed').length
    }, [tasks])

    const completedToday = useMemo(() => tasks.filter((t) => t.status === 'Completed').length, [tasks])
    const dailyTarget = tasks.length
    const remaining = Math.max(0, dailyTarget - completedToday)

    const notifications = useMemo(() => [] as { id: string; kind: string; title: string; detail: string; at: string }[], [])

    const openTask = (id: string) => {
      setActiveTaskId(id)
      setProgressOpen(true)
    }

    const startTask = (id: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'In progress', progressPct: Math.max(1, t.progressPct) } : t)),
      )
    }

    const markComplete = (id: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Completed', progressPct: 100 } : t)))
    }

    const submitQuickLog = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const next: WorkerLog = {
        id: `wlog_${Date.now().toString(36)}`,
        at: new Date().toISOString(),
        tasksCompleted: String(fd.get('tasksCompleted') ?? ''),
        workersPresent: Number(fd.get('workersPresent') ?? 0),
        issuesFaced: String(fd.get('issuesFaced') ?? ''),
        photoName: String(fd.get('photoName') ?? '').trim() || null,
      }
      const updated = [next, ...workerLogs].slice(0, 30)
      setWorkerLogs(updated)
      safeWriteWorkerLogs(updated)
      e.currentTarget.reset()
      setLogOpen(false)
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
              What to do today, what’s urgent, and quick reporting.
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
            <Button onClick={() => navigate('/app/emergency')} variant="danger">
              <AlertTriangle className="size-4" />
              Emergency
            </Button>
          </div>
        </div>

        {/* Top summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Today’s tasks</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{tasks.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Pending logs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{pendingLogs}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Open issues reported</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{myIssuesOpen}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[color:var(--color-text_secondary)]">Upcoming deadlines</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{upcomingDeadlines}</CardContent>
          </Card>
        </div>

        {/* Today’s tasks hero */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Today’s assigned tasks</CardTitle>
                <CardDescription>Card-based, quick actions</CardDescription>
              </div>
              <Button variant="secondary" onClick={() => navigate('/app/my-tasks')}>
                <ClipboardList className="size-4" />
                View my tasks
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-[color:var(--color-text_secondary)]">{t.location}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {priorityBadge(t.priority)}
                      {statusBadge(t.status)}
                      <span className="font-mono text-[11px] text-[color:var(--color-text_muted)]">{t.id}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[color:var(--color-text_secondary)]">
                    <div className="flex items-center justify-end gap-1">
                      <CalendarDays className="size-4" />
                      <span>Due</span>
                    </div>
                    <div className="font-semibold text-[color:var(--color-text)]">{formatDate(t.deadline)}</div>
                    <div className="mt-1 text-[11px]">
                      {t.startTime}–{t.endTime}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-[color:var(--color-text_secondary)]">
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

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => startTask(t.id)}
                    disabled={t.status !== 'Not started'}
                  >
                    <Timer className="size-4" />
                    Start
                  </Button>
                  <Button variant="secondary" onClick={() => openTask(t.id)} disabled={t.status === 'Completed'}>
                    Update
                  </Button>
                  <Button onClick={() => markComplete(t.id)} disabled={t.status === 'Completed'}>
                    <CheckCircle2 className="size-4" />
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Middle split */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {/* Daily target / progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Daily work target</CardTitle>
                <CardDescription>
                  {completedToday} / {dailyTarget} tasks completed today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-[color:var(--color-text_secondary)]">Remaining</div>
                  <div className="font-semibold">{remaining}</div>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-[color:var(--color-success)]"
                    style={{ width: `${dailyTarget ? Math.round((completedToday / dailyTarget) * 100) : 0}%` }}
                  />
                </div>
                <div className="text-xs text-[color:var(--color-text_secondary)]">
                  Tip: mark tasks complete as you finish them to keep your supervisor updated.
                </div>
              </CardContent>
            </Card>

            {/* Daily log quick form (inline) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">Submit daily log (quick)</CardTitle>
                    <CardDescription>Fast log; works offline-friendly later.</CardDescription>
                  </div>
                  <Button variant="secondary" onClick={() => setLogOpen(true)}>
                    <ClipboardCheck className="size-4" />
                    Open
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Today’s logs</div>
                  <div className="mt-1 text-2xl font-semibold">{todayLogs.length}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Pending</div>
                  <div className="mt-1 text-2xl font-semibold">{pendingLogs}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick actions</CardTitle>
                <CardDescription>Large tap targets</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button className="w-full justify-start" onClick={() => navigate('/app/issues/new')}>
                  <ShieldAlert className="size-4" />
                  Report issue
                </Button>
                <Button className="w-full justify-start" variant="secondary" onClick={() => navigate('/app/rfi')}>
                  <Timer className="size-4" />
                  Raise / view RFI
                </Button>
                <Button className="w-full justify-start" variant="secondary" onClick={() => navigate('/app/contacts')}>
                  <Sparkles className="size-4" />
                  Contact supervisor
                </Button>
                <Button className="w-full justify-start" variant="danger" onClick={() => navigate('/app/emergency')}>
                  <AlertTriangle className="size-4" />
                  Emergency alert
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Notifications</CardTitle>
                <CardDescription>Worker-only alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.length ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{n.title}</div>
                          <div className="mt-0.5 text-xs text-[color:var(--color-text_secondary)]">{n.detail}</div>
                        </div>
                        <div className="text-[11px] text-[color:var(--color-text_muted)]">{n.at}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[color:var(--color-text_muted)]">No notifications from the API yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My submitted reports */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My submitted reports / updates</CardTitle>
            <CardDescription>Daily logs, issues, RFIs</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-4">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Daily logs submitted</div>
              <div className="mt-1 text-2xl font-semibold">{workerLogs.length}</div>
              <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                Latest: {workerLogs[0] ? formatDate(workerLogs[0].at) : '—'}
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-4">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Issues raised</div>
              <div className="mt-1 text-2xl font-semibold">{myIssuesOpen}</div>
              <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">Open (not closed)</div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-4">
              <div className="text-xs text-[color:var(--color-text_secondary)]">RFIs raised</div>
              <div className="mt-1 text-2xl font-semibold">{myRfisCount}</div>
              <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">Tracked in RFI Center</div>
            </div>
          </CardContent>
        </Card>

        {/* Progress modal */}
        <Modal
          open={progressOpen}
          onOpenChange={setProgressOpen}
          title="Update progress"
          description="Quick update for your supervisor."
          footer={
            <Button type="submit" form="worker-progress-form">
              Save
            </Button>
          }
        >
          <form
            id="worker-progress-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!activeTaskId) return
              const fd = new FormData(e.currentTarget)
              const pct = clampPct(Number(fd.get('progressPct') ?? 0))
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === activeTaskId
                    ? {
                        ...t,
                        progressPct: pct,
                        status: pct >= 100 ? 'Completed' : pct > 0 ? 'In progress' : 'Not started',
                      }
                    : t,
                ),
              )
              setProgressOpen(false)
              e.currentTarget.reset()
            }}
          >
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="progressPct">
                Progress (%)
              </label>
              <Input id="progressPct" name="progressPct" type="number" min={0} max={100} defaultValue={25} required />
            </div>
            <div className="text-xs text-[color:var(--color-text_secondary)]">
              If you mark 100%, the task is automatically set to Completed.
            </div>
          </form>
        </Modal>

        {/* Quick log modal */}
        <Modal
          open={logOpen}
          onOpenChange={setLogOpen}
          title="Submit daily log"
          description="Fast submission (saved locally in this MVP)."
          footer={
            <Button type="submit" form="worker-log-form">
              <ClipboardCheck className="size-4" />
              Submit
            </Button>
          }
        >
          <form id="worker-log-form" className="space-y-4" onSubmit={submitQuickLog}>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="tasksCompleted">
                Tasks completed
              </label>
              <textarea
                id="tasksCompleted"
                name="tasksCompleted"
                className="mt-1.5 flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                placeholder="e.g., Rebar tying L9 completed, pump line checked..."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="workersPresent">
                  Workers present
                </label>
                <Input id="workersPresent" name="workersPresent" type="number" min={0} defaultValue={10} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="photoName">
                  Upload photo (name)
                </label>
                <Input id="photoName" name="photoName" placeholder="optional_photo.jpg" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="issuesFaced">
                Issues faced
              </label>
              <textarea
                id="issuesFaced"
                name="issuesFaced"
                className="mt-1.5 flex min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                placeholder="e.g., pump delay, shortage of binding wire..."
              />
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  if (role === 'owner') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Owner dashboard</h1>
            <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
              Know what to fix today — cost drift, delay risk, burn rate, and cash buffer at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm shadow-sm">
              <span className="text-[color:var(--color-text_secondary)]">Project</span>
              <div className="relative">
                <select
                  className="appearance-none bg-transparent pr-6 font-semibold text-[color:var(--color-text)] focus:outline-none"
                  value={currentProjectIdOwner ?? ''}
                  onChange={(e) => setCurrentProjectIdOwner(e.target.value || null)}
                  aria-label="Select project"
                >
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/app/insights')}>
              View insights
            </Button>
          </div>
        </div>

        {activeOwnerProject ? (
          <div className="text-xs text-[color:var(--color-text_muted)]">
            Active:{' '}
            <span className="font-semibold text-[color:var(--color-text_secondary)]">
              {activeOwnerProject.currentForm.siteLocation || activeOwnerProject.name}
            </span>
          </div>
        ) : null}
        {ownerDashboardLoading ? (
          <div className="text-xs text-[color:var(--color-text_secondary)]">Loading owner metrics…</div>
        ) : null}

        {/* Top KPI cards (actionable) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-[#dbe9f8] bg-[#eef3fb] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">Est. project cost</CardTitle>
                  <CardDescription title="From approved planning report">
                    Plan total + contingency
                  </CardDescription>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${hasReport ? kpiPillColor('good') : kpiPillColor('warning')}`}>
                  {isApproved ? 'Approved' : hasReport ? 'Draft' : 'No plan'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <div className="text-2xl font-bold">
                  {reportCost ? formatINR(reportCost.grandTotal) : ownerCostBreakdown?.total_inr ? formatINR(ownerCostBreakdown.total_inr) : '—'}
                </div>
                <TrendingUp className="size-5 text-[color:var(--color-text_muted)]" />
              </div>
              <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                {reportCost ? `₹${reportCost.costPerSqFt.toLocaleString('en-IN')}/sqft · 5% contingency included` : 'Generate a plan to see estimates'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#cfe8de] bg-[#e9f7f2] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">Timeline</CardTitle>
                  <CardDescription title="Estimated duration from planning report">
                    Planned duration
                  </CardDescription>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${feasibility === 'Feasible' ? kpiPillColor('good') : feasibility ? kpiPillColor('critical') : kpiPillColor('warning')}`}>
                  {feasibility ?? 'No plan'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <div className="text-2xl font-bold">
                  {estimatedMonths != null ? `${estimatedMonths} mo` : ownerAvgProgress != null ? `${ownerAvgProgress}%` : '—'}
                </div>
                <Timer className="size-5 text-[color:var(--color-text_muted)]" />
              </div>
              <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                {reportTimeline ? `${reportTimeline.phases.length} phases · ${reportTimeline.totalMonths.toFixed(1)} months total` : 'Add tasks to chart progress'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#d5ece8] bg-[#edf8f6] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">Workforce</CardTitle>
                  <CardDescription title="Required crew from planning report">
                    Planned headcount
                  </CardDescription>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${kpiPillColor('good')}`}>{hasReport ? 'Plan' : 'N/A'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <div className="text-2xl font-bold">{reportWorkforce ? reportWorkforce.total : '—'}</div>
                <IndianRupee className="size-5 text-[color:var(--color-text_muted)]" />
              </div>
              <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                {reportWorkforce ? `Peak: ${reportWorkforce.peak} · ${reportWorkforce.byTrade.length} trades` : 'Generate a plan to see workforce'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#e1e8f7] bg-[#f2f5fc] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">Contingency reserve</CardTitle>
                  <CardDescription title="5% buffer from planning report">
                    Buffer health
                  </CardDescription>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${reportCost ? kpiPillColor('good') : kpiPillColor('warning')}`}>
                  {reportCost ? 'Safe' : 'No plan'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <div className="text-2xl font-bold">
                  {reportCost ? formatINR(reportCost.contingency) : ownerCostBreakdown?.contingency_inr != null ? formatINR(ownerCostBreakdown.contingency_inr) : '—'}
                </div>
                <TrendingDown className="size-5 text-[color:var(--color-text_muted)]" />
              </div>
              <p className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                {reportCost ? `${((reportCost.contingency / reportCost.totalCost) * 100).toFixed(0)}% of total project cost` : 'Contingency from planning report'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI insights + priority alerts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="size-4 text-[color:var(--color-primary_dark)]" />
                    AI recommendations
                  </CardTitle>
                  <CardDescription>
                    Auto-generated actions from logs, dependencies, and supplier benchmarks
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary_light)]/25 px-3 py-1 text-xs font-semibold text-[color:var(--color-primary_dark)]">
                  <Sparkles className="size-3.5" />
                  Updated today
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[color:var(--color-text_secondary)]">
                Connect an insights or recommendations endpoint to populate this panel. Until then, use{' '}
                <button type="button" className="font-semibold text-[color:var(--color-primary)] underline" onClick={() => navigate('/app/insights')}>
                  Project insights
                </button>{' '}
                and the timeline.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
                Risk summary
              </CardTitle>
              <CardDescription>From approved planning report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-error)]/10 p-3 text-center">
                  <div className="text-xs font-semibold text-[color:var(--color-error)]">High</div>
                  <div className="mt-1 text-lg font-bold">{reportRisks?.highCount ?? '—'}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-warning)]/12 p-3 text-center">
                  <div className="text-xs font-semibold text-[color:var(--color-warning)]">Medium</div>
                  <div className="mt-1 text-lg font-bold">{reportRisks?.mediumCount ?? '—'}</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-info)]/10 p-3 text-center">
                  <div className="text-xs font-semibold text-[color:var(--color-info)]">Low</div>
                  <div className="mt-1 text-lg font-bold">{reportRisks ? Math.max(0, reportRisks.risks.length - reportRisks.highCount - reportRisks.mediumCount) : '—'}</div>
                </div>
              </div>
              {reportRisks?.risks.slice(0, 3).map((r, i) => (
                <div key={i} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-xs">
                  <span className={`font-semibold ${r.level === 'High' ? 'text-[color:var(--color-error)]' : 'text-[color:var(--color-warning)]'}`}>[{r.level}] </span>
                  {r.risk.slice(0, 72)}
                </div>
              )) ?? (
                <p className="text-xs text-[color:var(--color-text_secondary)]">Risks will appear after generating a plan.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics + variance + health */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineIcon className="size-4 text-[color:var(--color-info)]" />
                Task progress snapshot
              </CardTitle>
              <CardDescription>Percent complete by task row from timeline_tasks (placeholder until spend curves exist)</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {ownerLineData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ownerLineData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                    <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                    />
                    <Tooltip
                      formatter={(v) => (typeof v === 'number' ? `${v}%` : String(v))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="planned"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      dot={false}
                      name="% complete"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#2FBFAD"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      name="% complete"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] text-sm text-[color:var(--color-text_secondary)]">
                  No timeline_tasks yet — add tasks to your dashboard API to chart progress.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project health score</CardTitle>
              <CardDescription>Confidence from planning engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Confidence</div>
                  <div className="text-3xl font-bold">{confidence != null ? `${confidence}%` : ownerAvgProgress != null ? `${ownerAvgProgress}` : '—'}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${confidence != null ? (confidence >= 75 ? kpiPillColor('good') : kpiPillColor('warning')) : kpiPillColor('warning')}`}>
                  {confidence != null ? `${confidence >= 75 ? 'High' : 'Medium'}` : 'No plan'}
                </span>
              </div>
              {confidence != null ? (
                <ScoreBar label="Plan confidence score" value={confidence} />
              ) : ownerAvgProgress != null ? (
                <ScoreBar label="Average task completion" value={ownerAvgProgress} />
              ) : (
                <p className="text-xs text-[color:var(--color-text_muted)]">Generate a planning report to see score.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cost breakdown + variance, timeline snapshot, activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Cost breakdown & variance</CardTitle>
                  <CardDescription>Highlights highest deviation vs plan</CardDescription>
                </div>
                <Button variant="secondary" onClick={() => navigate('/app/insights')}>
                  Drill down
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-[280px]">
                  {ownerPieData.some((p) => p.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ownerPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={2}
                        >
                          {ownerPieData.map((_, idx) => (
                            <Cell key={idx} fill={pieColors[idx % pieColors.length]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => (typeof v === 'number' ? formatINR(v) : String(v))}
                          contentStyle={{
                            borderRadius: 12,
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] text-sm text-[color:var(--color-text_secondary)]">
                      Generate a planning report to see cost breakdown.
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {reportCost ? (
                    reportCost.phases.map(({ name, cost }) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold">{name}</div>
                          <div className="text-xs text-[color:var(--color-text_secondary)]">{formatINR(cost)}</div>
                        </div>
                        <CheckCircle2 className="size-4 text-[color:var(--color-text_muted)]" />
                      </div>
                    ))
                  ) : ownerCostBreakdown ? (
                    (
                      [
                        ['Foundation', ownerCostBreakdown.foundation_inr],
                        ['Structure', ownerCostBreakdown.structure_inr],
                        ['MEP', ownerCostBreakdown.mep_inr],
                        ['Finishing', ownerCostBreakdown.finishing_inr],
                      ] as const
                    ).map(([name, amt]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold">{name}</div>
                          <div className="text-xs text-[color:var(--color-text_secondary)]">{formatINR(amt)}</div>
                        </div>
                        <CheckCircle2 className="size-4 text-[color:var(--color-text_muted)]" />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[color:var(--color-text_secondary)]">Phase amounts appear after generating a planning report.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-[color:var(--color-primary_dark)]" />
                  This week progress
                </CardTitle>
                <CardDescription>Mini snapshot (click to open timeline)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[color:var(--color-text_secondary)]">
                <div className="flex items-center justify-between">
                  <span>Tasks completed</span>
                  <span className="font-semibold text-[color:var(--color-text)]">12 / 18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Behind by</span>
                  <span className="font-semibold text-[color:var(--color-error)]">3 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bottleneck</span>
                  <span className="font-semibold">Facade</span>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/app/timeline')}>
                  Open timeline
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live activity</CardTitle>
                <CardDescription>Logs, RFIs, issues — makes the dashboard feel alive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { t: 'RFI raised', d: 'Structural conflict in east stair shaft', sev: 'info' as const },
                  { t: 'Issue resolved', d: 'Steel batch certificate mismatch', sev: 'good' as const },
                  { t: 'Log added', d: 'L9 slab pour completed (photo attached)', sev: 'good' as const },
                  { t: 'Delay signal', d: 'Facade crew under target for 3 days', sev: 'warning' as const },
                ].map((x) => (
                  <div
                    key={x.t + x.d}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{x.t}</div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          x.sev === 'warning'
                            ? kpiPillColor('warning')
                            : x.sev === 'info'
                              ? 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
                              : kpiPillColor('good')
                        }`}
                      >
                        {x.sev}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{x.d}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency status</CardTitle>
                <CardDescription>Innovation 12 — broadcast + log</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[color:var(--color-text_secondary)]">
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[color:var(--color-text)]">Last emergency</span>
                    <span className="text-xs text-[color:var(--color-text_muted)]">2 days ago</span>
                  </div>
                  <div className="mt-1 text-xs">Scaffold issue reported on north face</div>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/app/emergency')}>
                  View emergency log
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engineer dashboard</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Action-oriented execution cockpit for delivery, RFIs, snags, and team coordination.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/timeline')}>Create Task</Button>
          <Button variant="secondary" onClick={() => navigate('/app/rfi')}>Respond to RFI</Button>
          <Button variant="secondary" onClick={() => navigate('/app/issues')}>Add Issue</Button>
          <Button variant="secondary" onClick={() => navigate('/app/documents')}>Upload Document</Button>
          <Button variant="danger" onClick={() => navigate('/app/emergency')}>Emergency Alert</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { title: 'Assigned Projects', value: '3', tone: 'bg-[#eef3fb] border-[#dbe9f8]' },
          { title: 'Tasks Due This Week', value: '14', tone: 'bg-[#e9f7f2] border-[#cfe8de]' },
          { title: 'Open RFIs', value: '6', tone: 'bg-[#edf8f6] border-[#d5ece8]' },
          { title: 'Open Issues / Snags', value: '9', tone: 'bg-[#f2f5fc] border-[#e1e8f7]' },
          { title: 'Budget Variance', value: '+3.2%', tone: 'bg-[#fff7e8] border-[#f6e4bb]' },
          { title: 'Schedule Variance', value: '+4 days', tone: 'bg-[#ffeef0] border-[#f8d8dd]' },
        ].map((kpi) => (
          <Card key={kpi.title} className={kpi.tone}>
            <CardContent className="pt-4">
              <div className="text-xs text-[color:var(--color-text_secondary)]">{kpi.title}</div>
              <div className="mt-1 text-xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[color:var(--color-primary_dark)]" />
                Project Progress Overview
              </CardTitle>
              <CardDescription>Execution status for current focus project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">% Completion</div>
                  <div className="mt-1 text-2xl font-bold">68%</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Current Phase</div>
                  <div className="mt-1 text-sm font-semibold">Structure + MEP</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Days Remaining</div>
                  <div className="mt-1 text-2xl font-bold">47</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Track</div>
                  <span className="mt-1 inline-flex rounded-full bg-[color:var(--color-warning)]/12 px-2 py-1 text-xs font-semibold text-[color:var(--color-warning)]">
                    Delay Risk
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-[color:var(--color-text_secondary)]">
                  <span>Overall Progress</span>
                  <span className="font-semibold">68%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-[color:var(--color-primary)]" style={{ width: '68%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Active Tasks / Team Tasks</CardTitle>
              <CardDescription>Reassign, complete, or escalate delayed execution tasks.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Assigned To</th>
                    <th className="px-3 py-2">Deadline</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {[
                    { t: 'Rebar tying — L10 slab', assignee: 'Arjun Singh', due: 'Today 6:00 PM', status: 'In Progress', p: 'High' },
                    { t: 'MEP sleeve check — Core East', assignee: 'Rohit Jain', due: 'Tomorrow', status: 'Pending', p: 'Medium' },
                    { t: 'Scaffold inspection — North Face', assignee: 'Pawan Patil', due: 'Overdue 1 day', status: 'Delayed', p: 'High' },
                  ].map((row) => (
                    <tr key={row.t}>
                      <td className="px-3 py-3 font-semibold">{row.t}</td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{row.assignee}</td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{row.due}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[color:var(--color-bg)] px-2 py-1 text-xs font-semibold">{row.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={row.p === 'High' ? 'text-[color:var(--color-error)] font-semibold' : 'text-[color:var(--color-warning)] font-semibold'}>
                          {row.p}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline">Reassign</Button>
                          <Button size="sm" variant="secondary">Mark Complete</Button>
                          <Button size="sm" variant="outline">Escalate Delay</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>RFI Management Panel</CardTitle>
                <CardDescription>Pending and escalated RFIs with 48h SLA tracking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { id: 'RFI-142', title: 'Beam depth clash at stair core', state: 'Pending Response', sla: '12h left' },
                  { id: 'RFI-138', title: 'Facade anchor detail mismatch', state: 'Escalated', sla: '4h left' },
                  { id: 'RFI-131', title: 'Electrical conduit reroute', state: 'Pending Response', sla: '26h left' },
                ].map((r) => (
                  <div key={r.id} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{r.id}</div>
                      <span className="text-xs font-semibold text-[color:var(--color-warning)]">{r.sla}</span>
                    </div>
                    <div className="mt-1 text-[color:var(--color-text_secondary)]">{r.title}</div>
                    <div className="mt-2 text-xs">{r.state}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issue / Snag Tracker</CardTitle>
                <CardDescription>Critical issues, assigned repairs, and verification backlog.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[color:var(--color-text_secondary)]">
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-error)]/10 p-3">
                  <div className="text-xs">Critical Issues</div>
                  <div className="text-xl font-bold text-[color:var(--color-error)]">2</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-warning)]/12 p-3">
                  <div className="text-xs">Assigned Repairs</div>
                  <div className="text-xl font-bold">5</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-info)]/10 p-3">
                  <div className="text-xs">Verification Pending</div>
                  <div className="text-xl font-bold">3</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications / Alerts</CardTitle>
              <CardDescription>Execution alerts requiring immediate action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                'Budget overrun alert: Concrete consumption +6%',
                'Delay alert: Facade work behind by 2 days',
                'Emergency alert: Safety hazard at Tower A',
                'Escalation: RFI-138 nearing SLA breach',
              ].map((t) => (
                <div key={t} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2">
                  {t}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Fast operational actions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/app/timeline')}>Create Task</Button>
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/app/rfi')}>Respond to RFI</Button>
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/app/issues')}>Add Issue</Button>
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/app/documents')}>Upload Document</Button>
              <Button variant="danger" className="justify-start" onClick={() => navigate('/app/emergency')}>Emergency Alert</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High-impact extras</CardTitle>
              <CardDescription>Fast risk and productivity snapshots.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Projects at Risk</div>
                <div className="mt-1 font-semibold">2 projects delayed or over budget</div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Avg RFI Response Time</div>
                <div className="mt-1 font-semibold">19h (target: &lt; 24h)</div>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Team Productivity</div>
                <div className="mt-1 font-semibold">42 tasks completed this week</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Logs Feed</CardTitle>
            <CardDescription>Chronological worker updates with issue highlights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { time: '08:10', who: 'Arjun Singh', msg: 'Submitted slab prep log with 3 photos.' },
              { time: '10:25', who: 'Pawan Patil', msg: 'Raised snag: conduit alignment mismatch in shaft.' },
              { time: '12:05', who: 'Rohit Jain', msg: 'Updated repair progress for scaffold bracing.' },
            ].map((l) => (
              <div key={l.time + l.who} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{l.who}</span>
                  <span className="text-xs text-[color:var(--color-text_muted)]">{l.time}</span>
                </div>
                <div className="mt-1 text-[color:var(--color-text_secondary)]">{l.msg}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mini Gantt / Timeline Snapshot</CardTitle>
            <CardDescription>Upcoming milestones with delayed tasks highlighted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { m: 'Facade Completion', pct: 72, delayed: true, due: 'Aug 14' },
              { m: 'MEP Rough-in', pct: 56, delayed: false, due: 'Aug 20' },
              { m: 'Stair Core Finish', pct: 81, delayed: false, due: 'Aug 11' },
            ].map((g) => (
              <div key={g.m} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{g.m}</span>
                  <span className={g.delayed ? 'text-[color:var(--color-error)] text-xs font-semibold' : 'text-xs text-[color:var(--color-text_secondary)]'}>
                    {g.delayed ? 'Delayed' : 'On Track'} · Due {g.due}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className={g.delayed ? 'h-2 rounded-full bg-[color:var(--color-error)]' : 'h-2 rounded-full bg-[color:var(--color-primary)]'}
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

