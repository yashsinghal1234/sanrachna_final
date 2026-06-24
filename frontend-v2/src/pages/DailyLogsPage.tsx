import { Camera, FolderOpen, ImagePlus, Loader2, Clock, Users, User, ImageOff, Download } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

import { fetchWorkspaceDailyLogs } from '@/api/resources'
import { isBackendConfigured } from '@/api/http'
import {
  apiCreateProjectLogPhoto,
  apiListProjectLogs,
  apiPatchProjectLogStatus,
  logPhotoAbsoluteUrl,
  type ProjectLogDto,
} from '@/api/projectLogsApi'
import { messageFromApiError } from '@/api/projectTeamApi'
import { useAuth } from '@/auth/AuthContext'
import { CameraCaptureDialog, type CameraCaptureMeta } from '@/components/CameraCaptureDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { DailyLogEntry } from '@/types/dashboard.types'
import { cn } from '@/utils/cn'

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

function mapDtoToEntry(row: ProjectLogDto): DailyLogEntry {
  return {
    id: row.id,
    date: row.date,
    tasks_completed: row.tasks_completed,
    workers_present: row.workers_present,
    issues: row.issues,
    photo_url: row.photo_url,
    author: row.author,
    status: row.status,
    createdAt: row.createdAt,
    submittedBy: row.submittedBy ?? null,
    submittedByName: row.submittedByName ?? null,
    photoCapturedAt: row.photoCapturedAt ?? null,
    photoUploadedAt: row.photoUploadedAt ?? null,
  }
}

function fmtIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function statusBadge(status: string | undefined) {
  const s = status || 'approved'
  if (s === 'pending') return 'bg-amber-500/15 text-amber-900 ring-amber-500/30'
  if (s === 'rejected') return 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)] ring-[color:var(--color-error)]/25'
  return 'bg-emerald-500/12 text-emerald-900 ring-emerald-500/25'
}

export function DailyLogsPage() {
  const { role, token, user } = useAuth()
  const resolvedRole = role ?? 'engineer'
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)

  const [items, setItems] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backendOk = Boolean(isBackendConfigured() && token && currentProjectId && MONGO_ID_RE.test(currentProjectId))

  const [filterDate, setFilterDate] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterDate && item.date !== filterDate) return false
      if (filterAuthor) {
        const authorMatch = [item.author, item.submittedByName].some(
          (name) => name?.toLowerCase().includes(filterAuthor.toLowerCase())
        )
        if (!authorMatch) return false
      }
      return true
    })
  }, [items, filterDate, filterAuthor])

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayItems = items.filter((i) => i.date === todayStr)
  const todayHeadcount = todayItems
    .filter((i) => i.status === 'approved')
    .reduce((sum, item) => sum + (Number(item.workers_present) || 0), 0)
  const todayPending = todayItems.filter((i) => i.status === 'pending').length

  const exportCSV = useCallback(() => {
    if (!filteredItems.length) return
    const headers = ['Date', 'Status', 'Tasks Completed', 'Author', 'Workers Present', 'Issues']
    const rows = filteredItems.map((log) => [
      log.date,
      log.status || 'approved',
      `"${(log.tasks_completed || '').replace(/"/g, '""')}"`,
      `"${(log.submittedByName || log.author || '').replace(/"/g, '""')}"`,
      log.workers_present || 0,
      `"${(log.issues || '').replace(/"/g, '""')}"`
    ])
    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `DailyLogs_Export_${todayStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredItems, todayStr])

  const load = useCallback(async () => {
    if (!currentProjectId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (backendOk) {
        const { logs } = await apiListProjectLogs(currentProjectId)
        setItems((logs || []).map(mapDtoToEntry))
      } else {
        const rows = await fetchWorkspaceDailyLogs(currentProjectId)
        setItems(rows)
      }
    } catch (e) {
      setError(messageFromApiError(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, backendOk])

  useEffect(() => {
    void load()
  }, [load])

  const galleryRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  type PendingPhoto = {
    id: string
    file: File
    url: string
    photoCapturedAt: string
    captureSource: 'live_camera' | 'gallery'
  }
  const [pendingFiles, setPendingFiles] = useState<PendingPhoto[]>([])
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next: PendingPhoto[] = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      const photoCapturedAt =
        file.lastModified && !Number.isNaN(file.lastModified)
          ? new Date(file.lastModified).toISOString()
          : new Date().toISOString()
      next.push({
        id: `pf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
        photoCapturedAt,
        captureSource: 'gallery',
      })
    }
    if (next.length) setPendingFiles((p) => [...p, ...next])
  }

  const addCapturedFile = (file: File, meta: CameraCaptureMeta) => {
    if (!file.type.startsWith('image/')) return
    setPendingFiles((p) => [
      ...p,
      {
        id: `pf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
        photoCapturedAt: meta.capturedAtISO,
        captureSource: 'live_camera',
      },
    ])
  }

  const removePending = (id: string) => {
    setPendingFiles((p) => {
      const row = p.find((x) => x.id === id)
      if (row) URL.revokeObjectURL(row.url)
      return p.filter((x) => x.id !== id)
    })
  }

  const submitPhotos = async () => {
    if (!backendOk || !currentProjectId) {
      setUploadMsg('Connect to the API and select a server project to upload photos.')
      return
    }
    if (resolvedRole !== 'worker') return
    if (!pendingFiles.length) {
      setUploadMsg('Add at least one photo.')
      return
    }
    setUploading(true)
    setUploadMsg(null)
    try {
      for (const p of pendingFiles) {
        const fd = new FormData()
        fd.append('photo', p.file)
        fd.append('date', logDate)
        fd.append('tasks_completed', caption.trim() || 'Site photo log')
        fd.append('issues', '')
        fd.append('photoCapturedAt', p.photoCapturedAt || new Date().toISOString())
        await apiCreateProjectLogPhoto(currentProjectId, fd)
      }
      for (const p of pendingFiles) URL.revokeObjectURL(p.url)
      setPendingFiles([])
      setCaption('')
      setUploadMsg('Photos submitted. Waiting for engineer approval.')
      await load()
    } catch (e) {
      setUploadMsg(messageFromApiError(e))
    } finally {
      setUploading(false)
    }
  }

  const [approveCounts, setApproveCounts] = useState<Record<string, string>>({})

  const approveLog = async (logId: string, status: 'approved' | 'rejected') => {
    if (!backendOk || !currentProjectId || resolvedRole !== 'engineer') return
    const raw = approveCounts[logId]
    const workersPresent = raw !== undefined && raw !== '' ? Number(raw) : 1
    try {
      await apiPatchProjectLogStatus(currentProjectId, logId, {
        status,
        workersPresent: status === 'approved' ? (Number.isFinite(workersPresent) && workersPresent >= 0 ? workersPresent : 1) : undefined,
      })
      await load()
    } catch (e) {
      setError(messageFromApiError(e))
    }
  }

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={FolderOpen}
          title="Select a project"
          description={
            backendOk
              ? 'Daily logs load from the server for the selected MongoDB project.'
              : 'Daily logs load from GET /api/v1/workspaces/:id/daily-logs in demo mode.'
          }
        />
      </div>
    )
  }

  const engineerActions = resolvedRole === 'engineer'
  const workerSubmit = resolvedRole === 'worker'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">Daily Logs</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
          Submit and view daily site photos. Approved logs automatically roll up into the project attendance records.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[color:var(--color-card)] border-[color:var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--color-text_secondary)]">Today's Headcount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--color-text)]">{todayHeadcount}</div>
            <p className="text-xs text-[color:var(--color-text_muted)]">From approved logs</p>
          </CardContent>
        </Card>
        <Card className="bg-[color:var(--color-card)] border-[color:var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--color-text_secondary)]">Logs Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--color-text)]">{todayItems.length}</div>
            <p className="text-xs text-[color:var(--color-text_muted)]">Total for {todayStr}</p>
          </CardContent>
        </Card>
        <Card className="bg-[color:var(--color-card)] border-[color:var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[color:var(--color-text_secondary)]">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{todayPending}</div>
            <p className="text-xs text-[color:var(--color-text_muted)]">Awaiting engineer review</p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5 px-4 py-3 text-sm text-[color:var(--color-error)]">
          {error}
        </div>
      ) : null}

      {workerSubmit && backendOk ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="size-4 text-[color:var(--color-primary_dark)]" />
              Submit photo log
            </CardTitle>
            <CardDescription>
              Use <strong>Take photo</strong> for a live camera capture (time is saved with the image), or choose from your gallery. After an engineer approves, each log adds one attendance mark for you on that day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Log date</div>
                <Input className="mt-1" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Caption (optional)</div>
                <Input
                  className="mt-1"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Area / activity — e.g. North façade progress"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
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
              <Button type="button" disabled={uploading || !pendingFiles.length} onClick={() => void submitPhotos()}>
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  'Submit to server'
                )}
              </Button>
            </div>
            {pendingFiles.length ? (
              <div className="flex flex-wrap gap-3">
                {pendingFiles.map((p) => (
                  <div key={p.id} className="flex w-28 flex-col gap-1">
                    <button
                      type="button"
                      className="overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-[color:var(--color-border)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                      onClick={() => setLightboxUrl(p.url)}
                      title="Tap to enlarge"
                    >
                      <img
                        src={p.url}
                        alt=""
                        className="h-24 w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </button>
                    <p className="text-[10px] text-[color:var(--color-text_muted)]">
                      {p.captureSource === 'live_camera' ? 'Live camera' : 'Gallery'} ·{' '}
                      {new Date(p.photoCapturedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <button
                      type="button"
                      className="text-center text-xs font-semibold text-[color:var(--color-error)] hover:underline"
                      onClick={() => removePending(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-text_muted)]">No photos queued.</p>
            )}
            {uploadMsg ? <p className="text-sm text-[color:var(--color-text_secondary)]">{uploadMsg}</p> : null}
            <p className="text-xs text-[color:var(--color-text_muted)]">Signed in as {user?.name ?? 'Worker'}.</p>
          </CardContent>
        </Card>
      ) : null}

      {workerSubmit && !backendOk ? (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-text_secondary)]">
            Photo upload to the database requires the app to be pointed at your Sanrachna API (VITE_BACKEND_URL) and a server-backed project selected. Use{' '}
            <span className="font-semibold">Submit log</span> in the menu for the full daily workflow, or switch to demo mode logs only.
          </CardContent>
        </Card>
      ) : null}

      {engineerActions && backendOk ? (
        <Card className="border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
          <CardContent className="py-3 text-sm text-[color:var(--color-text_secondary)]">
            Engineer: Approve each pending log and set the headcount for that photo. Totals by date are stored under project attendance.
          </CardContent>
        </Card>
      ) : null}



      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Recent logs</CardTitle>
            <CardDescription>{backendOk ? 'From your project database' : 'workspace feed'}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="w-auto h-9 text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="Filter by date"
            />
            <Input
              type="text"
              placeholder="Filter author..."
              className="w-36 sm:w-40 h-9 text-sm"
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredItems.length === 0}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-[color:var(--color-primary)]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text_muted)]">No logs found matching criteria.</p>
          ) : null}
          {!loading && filteredItems.map((log) => {
            const src = logPhotoAbsoluteUrl(log.photo_url)
            const st = log.status || 'approved'
            return (
              <div
                key={log.id}
                className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text_muted)]">{log.date}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                          statusBadge(typeof log.status === 'string' ? log.status : undefined),
                        )}
                      >
                        {st}
                      </span>
                    </div>

                    {/* Main Title/Tasks */}
                    <p className="text-base font-semibold text-[color:var(--color-text)] leading-snug break-words">
                      {log.tasks_completed}
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid gap-2 text-xs text-[color:var(--color-text_secondary)]">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 opacity-70" />
                        <span>{log.submittedByName || log.author}</span>
                      </div>
                      
                      {st === 'approved' ? (
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 opacity-70" />
                          <span>People in frame: <strong className="text-[color:var(--color-text)]">{log.workers_present}</strong></span>
                        </div>
                      ) : null}

                      {fmtIso(log.photoCapturedAt) || fmtIso(log.photoUploadedAt) ? (
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 opacity-70" />
                          <span className="flex flex-wrap gap-x-3">
                            {fmtIso(log.photoCapturedAt) ? <span>Photo: {fmtIso(log.photoCapturedAt)}</span> : null}
                            {fmtIso(log.photoUploadedAt) ? <span>Uploaded: {fmtIso(log.photoUploadedAt)}</span> : null}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Status specific messages */}
                    <div className="space-y-1 pt-1">
                      {st === 'approved' && (log.submittedByName || log.author) ? (
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ Attendance: +1 for {log.submittedByName || log.author} (rolled into project totals)
                        </p>
                      ) : null}
                      {st === 'pending' ? (
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                          Pending approval — attendance will be applied after engineer approval
                        </p>
                      ) : null}
                      {log.issues ? (
                        <div className="mt-2 rounded bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400 border border-red-500/20">
                          <span className="font-semibold">Reported Issue:</span> {log.issues}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right side: Image thumbnail */}
                  {src ? (
                    <button
                      type="button"
                      className="shrink-0 group overflow-hidden rounded-xl ring-1 ring-[color:var(--color-border)] transition-all hover:ring-2 hover:ring-[color:var(--color-primary)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                      onClick={() => setLightboxUrl(src)}
                      title="View full size"
                    >
                      <img
                        src={src}
                        alt="Log photo"
                        className="h-32 w-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement
                          img.style.display = 'none'
                          const parent = img.closest('button')
                          if (parent) {
                            parent.insertAdjacentHTML('afterend', '<div class="flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-xl bg-[color:var(--color-bg)] ring-1 ring-[color:var(--color-border)] text-xs text-[color:var(--color-text_muted)]"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>No image</div>')
                            parent.remove()
                          }
                        }}
                      />
                    </button>
                  ) : (
                    <div className="flex shrink-0 flex-col gap-2 h-32 w-48 items-center justify-center rounded-xl bg-[color:var(--color-bg)] ring-1 ring-[color:var(--color-border)] text-xs text-[color:var(--color-text_muted)]">
                      <ImageOff className="size-5 opacity-50" />
                      No image
                    </div>
                  )}
                </div>
                {engineerActions && st === 'pending' && backendOk ? (
                  <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[color:var(--color-border)] pt-4">
                    <div>
                      <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Workers counted</div>
                      <Input
                        className="mt-1 w-24"
                        type="number"
                        min={0}
                        placeholder="1"
                        value={approveCounts[log.id] ?? '1'}
                        onChange={(e) => setApproveCounts((m) => ({ ...m, [log.id]: e.target.value }))}
                      />
                    </div>
                    <Button type="button" onClick={() => void approveLog(log.id, 'approved')}>
                      Approve
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void approveLog(log.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <CameraCaptureDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(file, meta) => addCapturedFile(file, meta)} />

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3 rounded-[var(--radius-2xl)] bg-[color:var(--color-card)] p-4 shadow-xl ring-1 ring-[color:var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" onClick={() => window.open(lightboxUrl, '_blank', 'noopener,noreferrer')}>
                Open in new tab
              </Button>
              <Button type="button" variant="secondary" onClick={() => setLightboxUrl(null)}>
                Close
              </Button>
            </div>
            <div className="min-h-0 overflow-auto rounded-[var(--radius-xl)] bg-black/5 p-2">
              <img src={lightboxUrl} alt="" className="mx-auto max-h-[min(75vh,800px)] w-auto max-w-full object-contain" />
            </div>
            <p className="text-center text-xs text-[color:var(--color-text_secondary)]">Click outside this panel to close</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
