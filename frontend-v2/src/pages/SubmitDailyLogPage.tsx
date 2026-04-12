import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, ChevronRight, CloudRain, ClipboardCheck, FileText, Flag, ImagePlus, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { isBackendConfigured } from '@/api/http'
import { apiCreateProjectLogPhoto } from '@/api/projectLogsApi'
import { messageFromApiError } from '@/api/projectTeamApi'
import { CameraCaptureDialog, type CameraCaptureMeta } from '@/components/CameraCaptureDialog'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useProjectsStore } from '@/store/useProjectsStore'
import { formatDate } from '@/utils/format'

type TaskStatus = 'Not started' | 'In progress' | 'Completed' | 'Blocked'
type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low'
type WorkerTask = {
  id: string
  projectId: string
  title: string
  location: string
  priority: TaskPriority
  dueAt: string
  status: TaskStatus
  progressPct: number
}

type MaterialRow = { name: string; usedQty: string; receivedQty: string; shortage: boolean }
type PhotoAttachment = {
  id: string
  file: File
  preview: string
  photoCapturedAt: string
  captureSource: 'live_camera' | 'gallery'
}
type IssueFlag = { linkedTaskId: string | null; severity: 'Low' | 'Medium' | 'High' | 'Critical'; description: string }

type DailyLogDraft = {
  date: string // yyyy-mm-dd
  shift: 'Day' | 'Night'
  weather: string

  taskUpdates: Record<string, { completedPct: number; status: TaskStatus; timeSpentHrs?: number }>

  materials: MaterialRow[]
  siteNotes: { delays: string; safetyIncidents: string; specialNotes: string }
  /** Real image files — each is uploaded as its own log when using the API. */
  photoAttachments: PhotoAttachment[]
  photoCaption: string
  issue: IssueFlag | null
}

const TASKS_KEY = 'sanrachna_worker_tasks_v1'
const WORKER_LOGS_KEY = 'sanrachna_worker_logs_v1'
const DRAFT_KEY = 'sanrachna_dailylog_draft_v1'

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

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function statusPill(s: TaskStatus) {
  if (s === 'Completed') return <Badge variant="success">Completed</Badge>
  if (s === 'In progress') return <Badge variant="warning">In progress</Badge>
  if (s === 'Blocked') return <Badge variant="danger">Blocked</Badge>
  return <Badge variant="muted">Not started</Badge>
}

function priorityPill(p: TaskPriority) {
  if (p === 'Critical') return <Badge variant="danger">Critical</Badge>
  if (p === 'High') return <Badge variant="danger">High</Badge>
  if (p === 'Medium') return <Badge variant="warning">Medium</Badge>
  return <Badge variant="muted">Low</Badge>
}

type StepId = 'photos' | 'tasks' | 'materials' | 'issues' | 'review'
const STEPS: { id: StepId; label: string; icon: any }[] = [
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'tasks', label: 'Task updates', icon: ClipboardCheck },
  { id: 'materials', label: 'Materials', icon: FileText },
  { id: 'issues', label: 'Issues', icon: ShieldAlert },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
]

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

export function SubmitDailyLogPage() {
  const { role, user, token } = useAuth()
  const navigate = useNavigate()

  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projectsById = useProjectsStore((s) => s.projects)

  const myKey = useMemo(() => {
    const nm = user?.name?.trim()
    if (!nm) return 'Worker'
    return `Worker — ${nm}`
  }, [user?.name])

  const [now, setNow] = useState(() => new Date())

  // Tick every second for live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const date = now.toISOString().slice(0, 10)
  const liveTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const liveDate = now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const projectName = projectsById[currentProjectId]?.name ?? 'Project'
  const draftStorageKey = `${DRAFT_KEY}:${currentProjectId}:${myKey}:${date}`
  const tasksStorageKey = `${TASKS_KEY}:${currentProjectId}:${myKey}`

  const todaysTasks = useMemo(() => {
    const all = safeRead<WorkerTask[]>(tasksStorageKey, [])
    // No strong guarantee tasks are "today"; we treat tasks due today or already in progress as today’s list.
    const start = new Date(date).getTime()
    const end = start + 24 * 60 * 60 * 1000 - 1
    const isToday = (iso: string) => {
      const t = new Date(iso).getTime()
      return t >= start && t <= end
    }
    const selected = all.filter((t) => isToday(t.dueAt) || t.status === 'In progress' || t.status === 'Blocked')
    return selected.length ? selected : all.slice(0, 5)
  }, [tasksStorageKey, date])

  const defaultDraft: DailyLogDraft = useMemo(() => {
    const taskUpdates: DailyLogDraft['taskUpdates'] = {}
    for (const t of todaysTasks) {
      taskUpdates[t.id] = { completedPct: t.progressPct ?? 0, status: t.status ?? 'Not started' }
    }
    return {
      date,
      shift: 'Day',
      weather: '',
      taskUpdates,
      materials: [{ name: 'Cement', usedQty: '', receivedQty: '', shortage: false }],
      siteNotes: { delays: '', safetyIncidents: '', specialNotes: '' },
      photoAttachments: [],
      photoCaption: '',
      issue: null,
    }
  }, [todaysTasks, date])

  const [draft, setDraft] = useState<DailyLogDraft>(() => safeRead(draftStorageKey, defaultDraft))
  const [step, setStep] = useState<StepId>('photos')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const stepIdx = STEPS.findIndex((s) => s.id === step)
  const canPrev = stepIdx > 0
  const canNext = stepIdx < STEPS.length - 1
  const goPrev = () => setStep(STEPS[Math.max(0, stepIdx - 1)].id)
  const goNext = () => setStep(STEPS[Math.min(STEPS.length - 1, stepIdx + 1)].id)

  const saveDraft = () => safeWrite(draftStorageKey, draft)

  const tasksUpdatedCount = useMemo(() => Object.keys(draft.taskUpdates).length, [draft.taskUpdates])
  const photosUploadedCount = useMemo(() => draft.photoAttachments.length, [draft.photoAttachments])
  const issuesFlaggedCount = useMemo(() => (draft.issue ? 1 : 0), [draft.issue])

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const galleryRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const addPhotoFiles = (list: FileList | null) => {
    if (!list?.length) return
    const add: PhotoAttachment[] = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      const photoCapturedAt =
        file.lastModified && !Number.isNaN(file.lastModified)
          ? new Date(file.lastModified).toISOString()
          : new Date().toISOString()
      add.push({
        id: `pa_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        photoCapturedAt,
        captureSource: 'gallery',
      })
    }
    if (add.length) setDraft((d) => ({ ...d, photoAttachments: [...d.photoAttachments, ...add] }))
  }

  const addCapturedPhoto = (file: File, meta: CameraCaptureMeta) => {
    if (!file.type.startsWith('image/')) return
    setDraft((d) => ({
      ...d,
      photoAttachments: [
        ...d.photoAttachments,
        {
          id: `pa_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
          photoCapturedAt: meta.capturedAtISO,
          captureSource: 'live_camera',
        },
      ],
    }))
  }

  const removePhotoAttachment = (id: string) => {
    setDraft((d) => {
      const row = d.photoAttachments.find((x) => x.id === id)
      if (row) URL.revokeObjectURL(row.preview)
      return { ...d, photoAttachments: d.photoAttachments.filter((x) => x.id !== id) }
    })
  }

  const submit = () => {
    setSubmitError(null)
    // Update tasks back to My Tasks store
    const all = safeRead<any[]>(tasksStorageKey, [])
    const updated = all.map((t: any) => {
      const upd = draft.taskUpdates?.[t.id]
      if (!upd) return t
      return { ...t, progressPct: upd.completedPct, status: upd.status }
    })
    safeWrite(tasksStorageKey, updated)

    // Store daily log in same worker logs feed key (extra fields OK)
    const logs = safeRead<any[]>(WORKER_LOGS_KEY, [])
    const tasksCompleted = todaysTasks
      .filter((t) => (draft.taskUpdates[t.id]?.status ?? t.status) === 'Completed')
      .map((t) => t.title)
      .slice(0, 6)
      .join(', ')
    const issuesFaced = [draft.siteNotes.delays, draft.siteNotes.safetyIncidents, draft.siteNotes.specialNotes]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 700)
    const photoName = draft.photoAttachments[0]?.file.name ?? null

    const backendOk =
      Boolean(token) && isBackendConfigured() && currentProjectId && MONGO_ID_RE.test(currentProjectId)

    if (backendOk) {
      if (!draft.photoAttachments.length) {
        setSubmitError('Add at least one site photo — attendance is tracked from approved photo logs.')
        return
      }
      setSubmitting(true)
      void (async () => {
        try {
          for (const p of draft.photoAttachments) {
            const fd = new FormData()
            fd.append('photo', p.file)
            fd.append('date', draft.date)
            fd.append('tasks_completed', draft.photoCaption.trim() || tasksCompleted || 'Site photo log')
            fd.append('issues', issuesFaced || (draft.issue ? draft.issue.description : ''))
            fd.append('photoCapturedAt', p.photoCapturedAt || new Date().toISOString())
            await apiCreateProjectLogPhoto(currentProjectId, fd)
          }
          const all = safeRead<any[]>(tasksStorageKey, [])
          const updated = all.map((t: any) => {
            const upd = draft.taskUpdates?.[t.id]
            if (!upd) return t
            return { ...t, progressPct: upd.completedPct, status: upd.status }
          })
          safeWrite(tasksStorageKey, updated)
          for (const p of draft.photoAttachments) URL.revokeObjectURL(p.preview)
          safeRemove(draftStorageKey)
          navigate('/app/logs')
        } catch (e) {
          setSubmitError(messageFromApiError(e))
        } finally {
          setSubmitting(false)
        }
      })()
      return
    }

    const entry = {
      id: `dlog_${Date.now().toString(36)}`,
      at: nowIso(),
      tasksCompleted: tasksCompleted || '—',
      workersPresent: 0,
      issuesFaced: issuesFaced || (draft.issue ? draft.issue.description : ''),
      photoName,
      details: {
        draft,
        projectId: currentProjectId,
        projectName,
        worker: myKey,
      },
    }
    safeWrite(WORKER_LOGS_KEY, [entry, ...logs].slice(0, 60))
    safeRemove(draftStorageKey)
    navigate('/app/logs')
  }

  if (role !== 'worker') {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Submit daily log</h1>
        <p className="text-sm text-[color:var(--color-text_secondary)]">This page is designed for the worker role.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header / context strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit daily log</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Structured site update. With the API connected, site photos are required for each submission — engineers approve them to roll up attendance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <Button variant="danger" onClick={() => navigate('/app/emergency')}>
            <AlertTriangle className="size-4" />
            Emergency
          </Button>
        </div>
      </div>

      {submitError ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5 px-4 py-3 text-sm text-[color:var(--color-error)]">
          {submitError}
        </div>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Date &amp; Time</div>
            <div className="mt-1 text-sm font-semibold text-blue-700">{liveDate}</div>
            <div className="font-mono text-lg font-bold tabular-nums tracking-tight text-slate-900">{liveTime}</div>
          </div>
          <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Project</div>
            <div className="mt-1 text-sm font-semibold">{projectName}</div>
          </div>
          <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Worker</div>
            <div className="mt-1 text-sm font-semibold">{myKey}</div>
          </div>
          <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
            <div className="text-xs text-[color:var(--color-text_secondary)]">Shift</div>
            <div className="mt-2 flex items-center gap-2">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={draft.shift}
                onChange={(e) => setDraft((d) => ({ ...d, shift: e.target.value as DailyLogDraft['shift'] }))}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stepper (mobile-first) */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon
          const active = s.id === step
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-[color:var(--color-nav_active_ring)] bg-[color:var(--color-nav_active_bg)] text-[color:var(--color-nav_active_text)]'
                  : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-bg)]'
              }`}
            >
              <Icon className="size-4" />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Main step content */}
      {step === 'tasks' ? (
        <Card>
          <CardHeader>
            <CardTitle>Task progress logging</CardTitle>
            <CardDescription>Auto-filled from today’s assigned tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysTasks.map((t) => {
              const upd = draft.taskUpdates[t.id] ?? { completedPct: t.progressPct, status: t.status }
              return (
                <div key={t.id} className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{t.title}</div>
                      <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{t.location}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {priorityPill(t.priority)}
                        {statusPill(upd.status)}
                        <span className="font-mono text-[11px] text-[color:var(--color-text_muted)]">{t.id}</span>
                      </div>
                    </div>
                    <div className="text-xs text-[color:var(--color-text_secondary)]">
                      Due <span className="font-semibold text-[color:var(--color-text)]">{formatDate(t.dueAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Completed %</div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={upd.completedPct}
                        onChange={(e) => {
                          const pct = clampPct(Number(e.target.value))
                          setDraft((d) => ({
                            ...d,
                            taskUpdates: {
                              ...d.taskUpdates,
                              [t.id]: { ...upd, completedPct: pct, status: pct >= 100 ? 'Completed' : pct > 0 ? 'In progress' : 'Not started' },
                            },
                          }))
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Status</div>
                      <select
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                        value={upd.status}
                        onChange={(e) => {
                          const st = e.target.value as TaskStatus
                          setDraft((d) => ({
                            ...d,
                            taskUpdates: {
                              ...d.taskUpdates,
                              [t.id]: { ...upd, status: st, completedPct: st === 'Completed' ? 100 : upd.completedPct },
                            },
                          }))
                        }}
                      >
                        <option value="Not started">Not started</option>
                        <option value="In progress">In progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Time spent (hrs)</div>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={upd.timeSpentHrs ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? undefined : Number(e.target.value)
                          setDraft((d) => ({
                            ...d,
                            taskUpdates: {
                              ...d.taskUpdates,
                              [t.id]: { ...upd, timeSpentHrs: typeof v === 'number' && Number.isFinite(v) ? v : undefined },
                            },
                          }))
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      {step === 'materials' ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Materials used / received (optional)</CardTitle>
                <CardDescription>Helps detect shortages early</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.materials.map((m, idx) => (
                  <div key={`${m.name}_${idx}`} className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input
                        value={m.name}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            materials: d.materials.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                          }))
                        }
                        placeholder="Material"
                      />
                      <Input
                        value={m.usedQty}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            materials: d.materials.map((x, i) => (i === idx ? { ...x, usedQty: e.target.value } : x)),
                          }))
                        }
                        placeholder="Qty used"
                      />
                      <Input
                        value={m.receivedQty}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            materials: d.materials.map((x, i) => (i === idx ? { ...x, receivedQty: e.target.value } : x)),
                          }))
                        }
                        placeholder="Qty received"
                      />
                      <label className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text_secondary)]">
                        <input
                          type="checkbox"
                          checked={m.shortage}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              materials: d.materials.map((x, i) => (i === idx ? { ...x, shortage: e.target.checked } : x)),
                            }))
                          }
                        />
                        Shortage
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, materials: d.materials.filter((_, i) => i !== idx) }))}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setDraft((d) => ({ ...d, materials: [...d.materials, { name: '', usedQty: '', receivedQty: '', shortage: false }] }))}>
                  Add material row
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weather (optional)</CardTitle>
                <CardDescription>Quick context for delays</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2">
                  <CloudRain className="size-4 text-[color:var(--color-text_muted)]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    value={draft.weather}
                    onChange={(e) => setDraft((d) => ({ ...d, weather: e.target.value }))}
                    placeholder="Sunny / Rain / Cloudy…"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Site conditions / notes</CardTitle>
                <CardDescription>Structured observations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Delays / constraints</div>
                  <textarea
                    className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                    value={draft.siteNotes.delays}
                    onChange={(e) => setDraft((d) => ({ ...d, siteNotes: { ...d.siteNotes, delays: e.target.value } }))}
                    placeholder="Pump delay, rain stoppage, material shortage…"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Safety incidents</div>
                  <textarea
                    className="mt-1.5 flex min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                    value={draft.siteNotes.safetyIncidents}
                    onChange={(e) => setDraft((d) => ({ ...d, siteNotes: { ...d.siteNotes, safetyIncidents: e.target.value } }))}
                    placeholder="Near miss / hazard / none"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Special notes</div>
                  <textarea
                    className="mt-1.5 flex min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                    value={draft.siteNotes.specialNotes}
                    onChange={(e) => setDraft((d) => ({ ...d, siteNotes: { ...d.siteNotes, specialNotes: e.target.value } }))}
                    placeholder="Anything else important"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {step === 'photos' ? (
        <Card>
          <CardHeader>
            <CardTitle>Site photos</CardTitle>
            <CardDescription>
              Use <strong>Take photo</strong> for a live camera shot (capture time is stored with the image). Gallery picks use the
              file’s last-modified time when available. Each approved log adds one attendance mark for you on that log date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Caption for all photos in this submission (optional)</div>
              <Input
                className="mt-1"
                value={draft.photoCaption}
                onChange={(e) => setDraft((d) => ({ ...d, photoCaption: e.target.value }))}
                placeholder="e.g. West wing shuttering, slab pour zone B"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addPhotoFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()}>
                <ImagePlus className="size-4" />
                Choose photos
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCameraOpen(true)}>
                <Camera className="size-4" />
                Take photo
              </Button>
            </div>
            {draft.photoAttachments.length ? (
              <div className="flex flex-wrap gap-3">
                {draft.photoAttachments.map((p) => (
                  <div key={p.id} className="flex w-32 flex-col gap-1">
                    <button
                      type="button"
                      className="overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-[color:var(--color-border)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                      onClick={() => setPhotoPreview(p.preview)}
                      title="Tap to enlarge"
                    >
                      <img src={p.preview} alt="" className="h-28 w-full object-cover" />
                    </button>
                    <p className="text-[10px] text-[color:var(--color-text_muted)]">
                      {p.captureSource === 'live_camera' ? 'Live camera' : 'Gallery'} ·{' '}
                      {new Date(p.photoCapturedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <button
                      type="button"
                      className="text-center text-xs font-semibold text-[color:var(--color-error)] hover:underline"
                      onClick={() => removePhotoAttachment(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
                No photos yet. Add at least one when submitting to the server.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 'issues' ? (
        <Card>
          <CardHeader>
            <CardTitle>Blockers / issues faced</CardTitle>
            <CardDescription>Fast escalation: convert to Issue Report or raise RFI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Was any issue encountered?</div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text_secondary)]">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.issue)}
                    onChange={(e) =>
                      setDraft((d) =>
                        e.target.checked
                          ? { ...d, issue: { linkedTaskId: todaysTasks[0]?.id ?? null, severity: 'Medium', description: '' } }
                          : { ...d, issue: null },
                      )
                    }
                  />
                  Yes
                </label>
              </div>

              {draft.issue ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Linked task</div>
                    <select
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={draft.issue.linkedTaskId ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          issue: d.issue ? { ...d.issue, linkedTaskId: e.target.value || null } : null,
                        }))
                      }
                    >
                      <option value="">Unlinked</option>
                      {todaysTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Severity</div>
                    <select
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      value={draft.issue.severity}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          issue: d.issue ? { ...d.issue, severity: e.target.value as IssueFlag['severity'] } : null,
                        }))
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Description</div>
                    <textarea
                      className="mt-1.5 flex min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                      value={draft.issue.description}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          issue: d.issue ? { ...d.issue, description: e.target.value } : null,
                        }))
                      }
                      placeholder="What happened? What is blocking you?"
                    />
                  </div>

                  <div className="sm:col-span-3 grid gap-2 sm:grid-cols-2">
                    <Button variant="secondary" onClick={() => navigate('/app/issues/new')}>
                      <ShieldAlert className="size-4" />
                      Convert to Issue Report
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/app/rfi')}>
                      Raise RFI
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-[color:var(--color-text_secondary)]">No issue flagged.</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 'review' ? (
        <Card>
          <CardHeader>
            <CardTitle>Final summary</CardTitle>
            <CardDescription>Review before submission</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <ClipboardCheck className="size-4" />
                Tasks updated
              </div>
              <div className="mt-2 text-2xl font-semibold">{tasksUpdatedCount}</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <Camera className="size-4" />
                Photos uploaded
              </div>
              <div className="mt-2 text-2xl font-semibold">{photosUploadedCount}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">Required when saving to the server</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <Flag className="size-4" />
                Issues flagged
              </div>
              <div className="mt-2 text-2xl font-semibold">{issuesFlaggedCount}</div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
              <div className="text-sm font-semibold">Actions</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  <ClipboardCheck className="size-4" />
                  {submitting ? 'Uploading…' : 'Submit daily log'}
                </Button>
              </div>
              <div className="mt-3 text-xs text-[color:var(--color-text_secondary)]">
                Submitting updates your task progress and adds this log to the dashboard feed.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Step navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={!canPrev}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <div className="text-xs text-[color:var(--color-text_secondary)]">
          Step {stepIdx + 1} / {STEPS.length}
        </div>
        <Button variant="secondary" onClick={goNext} disabled={!canNext}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <CameraCaptureDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(file, meta) => addCapturedPhoto(file, meta)} />

      {photoPreview ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setPhotoPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3 rounded-[var(--radius-2xl)] bg-[color:var(--color-card)] p-4 shadow-xl ring-1 ring-[color:var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => window.open(photoPreview, '_blank', 'noopener,noreferrer')}>
                Open in new tab
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPhotoPreview(null)}>
                Close
              </Button>
            </div>
            <div className="min-h-0 overflow-auto rounded-[var(--radius-xl)] bg-black/5 p-2">
              <img src={photoPreview} alt="" className="mx-auto max-h-[min(75vh,800px)] w-auto max-w-full object-contain" />
            </div>
            <p className="text-center text-xs text-[color:var(--color-text_secondary)]">Click outside this panel to close</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

